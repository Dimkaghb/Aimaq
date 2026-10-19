import asyncio
import json
import weakref

import structlog
from google import genai
from google.genai import types

from app.config import settings

log = structlog.get_logger()

# Quality model for prose (the explanation); fast model for structured extraction and judging.
MODEL = "gemini-2.5-pro"
FAST_MODEL = "gemini-2.5-flash"

# Gemini 2.5 "thinks" before answering and thinking tokens count against max_output_tokens.
# With a small limit the whole budget goes to thinking and the answer comes back EMPTY.
# So thinking is capped explicitly and the output limit is raised by the same amount.
# (2.5 Pro cannot disable thinking; its minimum budget is 128.)
THINKING_BUDGET_FAST = 0
THINKING_BUDGET_QUALITY = 1024


def _generation_config(system: str, max_output_tokens: int, model: str, **extra) -> types.GenerateContentConfig:
    thinking = THINKING_BUDGET_FAST if model == FAST_MODEL else THINKING_BUDGET_QUALITY
    return types.GenerateContentConfig(
        system_instruction=system,
        max_output_tokens=max_output_tokens + thinking,
        thinking_config=types.ThinkingConfig(thinking_budget=thinking),
        **extra,
    )

# One client per event loop: its async transport is bound to the loop it was first used on,
# and each Celery task runs in a new loop (asyncio.run).
_clients: "weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, genai.Client]" = weakref.WeakKeyDictionary()


def get_gemini_client() -> genai.Client:
    """Return the Gemini client for the running event loop."""
    loop = asyncio.get_running_loop()
    client = _clients.get(loop)
    if client is None:
        client = genai.Client(api_key=settings.gemini_api_key)
        _clients[loop] = client
    return client


def _finish_reason(response) -> str:
    candidate = response.candidates[0] if response.candidates else None
    return f"finish_reason={getattr(candidate, 'finish_reason', None)}"


async def call_gemini(
    system: str,
    user_message: str,
    model: str = MODEL,
    max_output_tokens: int = 1500,
) -> str:
    """Plain text generation via Gemini."""
    client = get_gemini_client()
    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=user_message,
            config=_generation_config(system, max_output_tokens, model),
        )
        text = response.text or ""
        if not text:
            raise RuntimeError(f"Gemini returned no text ({_finish_reason(response)})")
        return text
    except Exception as e:
        log.error("gemini_call_failed", model=model, error=str(e))
        raise


class EmptyResponse(RuntimeError):
    """Gemini answered with nothing usable (empty or a malformed function call)."""


async def call_gemini_with_tools(
    system: str,
    user_message: str,
    tools: list[types.Tool],
    model: str = FAST_MODEL,
    max_output_tokens: int = 2000,
) -> dict:
    """Structured output via Gemini function-calling.

    Returns the parsed arguments of the first function call in the response. The fast model
    occasionally returns an empty or malformed call; that is retried, and the last attempt
    escalates to the stronger model.
    """
    attempts = [model, model, MODEL] if model != MODEL else [model, model]
    last: EmptyResponse | None = None
    for attempt, attempt_model in enumerate(attempts, 1):
        try:
            return await _call_with_tools_once(system, user_message, tools, attempt_model, max_output_tokens)
        except EmptyResponse as e:
            last = e
            log.warning("gemini_empty_retry", model=attempt_model, attempt=attempt, error=str(e))
    raise last  # type: ignore[misc]


async def _call_with_tools_once(
    system: str,
    user_message: str,
    tools: list[types.Tool],
    model: str,
    max_output_tokens: int,
) -> dict:
    client = get_gemini_client()
    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=user_message,
            config=_generation_config(
                system, max_output_tokens, model,
                tools=tools,
                tool_config=types.ToolConfig(function_calling_config=types.FunctionCallingConfig(mode="ANY")),
            ),
        )

        candidate = response.candidates[0] if response.candidates else None
        if not candidate or not candidate.content or not candidate.content.parts:
            # An empty answer is a failure, not an empty plan: callers fall back explicitly.
            raise EmptyResponse(f"Gemini returned an empty response ({_finish_reason(response)})")

        for part in candidate.content.parts:
            if part.function_call:
                args = dict(part.function_call.args)
                log.debug("gemini_tool_call", function=part.function_call.name, args_keys=list(args.keys()))
                return {"function_name": part.function_call.name, "arguments": args}

        # No function call: accept JSON text, otherwise treat as unusable.
        text = response.text or ""
        log.warning("gemini_no_tool_call", model=model, text_length=len(text))
        try:
            return {"function_name": "text_fallback", "arguments": json.loads(text)}
        except (json.JSONDecodeError, TypeError):
            raise EmptyResponse("Gemini answered with text instead of a function call")

    except EmptyResponse:
        raise
    except Exception as e:
        log.error("gemini_tool_call_failed", model=model, error=str(e))
        raise
