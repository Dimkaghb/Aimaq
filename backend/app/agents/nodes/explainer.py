import time

import structlog

from app.db.queries import update_pipeline_step
from app.services.llm import call_gemini

log = structlog.get_logger()

SYSTEM_PROMPT = (
    "Ты — эксперт по коммерческой недвижимости в Таразе. "
    "Отвечай строго на русском языке. "
    "Используй деловой, но дружелюбный тон. "
    "Объясняй кратко и конкретно — без воды и общих фраз. "
    "Используй конкретные цифры из предоставленных данных: "
    "баллы трафика, количество конкурентов, близость транспорта, цену. "
    "Формат: для каждой локации — 2-3 предложения с ключевыми аргументами. "
    "Цены указывай в тенге с символом ₸. "
    "Упоминай только улицы, районы и ориентиры Тараза, подтверждённые входными данными. Не выдумывай метро, трафик или цены. "
    "Если показатель помечен «нет данных», не делай по нему выводов: прямо скажи, что он не оценён. "
    "Объясняй в бизнес-терминах: проходимость = потенциальные клиенты, "
    "близость остановок = удобство для сотрудников, мало конкурентов = свободная ниша."
)


def _measured(value: object, text: str) -> str:
    """`text` when the signal was measured, otherwise an explicit "no data" marker."""
    return text if value is not None else "нет данных (не удалось оценить)"


def _format_listings_for_prompt(listings: list[dict], business_type: str) -> str:
    """Format scored listings into a readable prompt for the LLM.

    Signals that could not be measured are marked "нет данных" so they are never presented
    as measurements; the neutral placeholder score behind them is not shown.
    """
    lines: list[str] = []
    for i, l in enumerate(listings, 1):
        breakdown = l.get("score_breakdown", {})
        competitors = l.get("competitor_count")
        stops = l.get("bus_stops_nearby")
        price_note = " (подозрительно низкая, вероятно неточная — не считать выгодной)" if l.get("price_suspect") else ""
        footfall = f"{breakdown.get('footfall', 0)}/100" if l.get("footfall_measured") else None
        competitors_text = f"{competitors} (балл: {breakdown.get('competitor', 0)}/100)" if competitors is not None else None
        lines.append(
            f"{i}. {l.get('title', 'Без названия')}\n"
            f"   Адрес: {l.get('address', 'Не указан')}\n"
            f"   Район: {l.get('district') or 'Не указан'}\n"
            f"   Цена: {l.get('price_tenge') or 'Не указана'} ₸/мес{price_note}\n"
            f"   Площадь: {l.get('area_sqm') or 'Не указана'} м²\n"
            f"   Общий балл: {l.get('total_score', 0)}/100\n"
            f"   Трафик: {_measured(footfall, footfall)}\n"
            f"   Конкуренты рядом: {_measured(competitors_text, competitors_text)}\n"
            f"   Остановки транспорта рядом: {_measured(stops, str(stops))}\n"
            f"   Цена/бюджет: {breakdown.get('price', 0)}/100\n"
            f"   Площадь (соответствие): {breakdown.get('area', 0)}/100"
        )
    return "\n\n".join(lines)


async def generate_explanation(
    scored_listings: list[dict],
    business_type: str,
    planner_reasoning: str = "",
    validation_results: list[dict] | None = None,
) -> str:
    """Generate a Russian explanation for the top scored listings using Gemini 2.5 Pro."""
    t0 = time.monotonic()

    formatted = _format_listings_for_prompt(scored_listings, business_type)

    # Build enriched prompt with planner context
    parts: list[str] = [
        f"Вот топ-{len(scored_listings)} локаций для бизнеса типа «{business_type}» в Таразе.",
        "Объясни для каждой, почему она подходит, используя конкретные цифры из данных.",
    ]

    if planner_reasoning:
        parts.append(
            f"\nКонтекст от планировщика (что важно для этого типа бизнеса):\n{planner_reasoning}"
        )

    if validation_results:
        kept = [v for v in validation_results if v.get("decision") == "keep"]
        if kept:
            notes = "\n".join(
                f"- {v.get('listing_id', '?')}: {v.get('reason', '')}" for v in kept
            )
            parts.append(f"\nЗаметки валидатора:\n{notes}")

    parts.append(f"\n{formatted}")
    user_prompt = "\n".join(parts)

    system = SYSTEM_PROMPT
    if planner_reasoning:
        system += (
            " Используй контекст планировщика, чтобы объяснить в бизнес-терминах, "
            "почему каждая локация подходит именно для данного типа бизнеса."
        )

    try:
        explanation = await call_gemini(system=system, user_message=user_prompt)
    except Exception as e:
        log.error("explainer_failed", error=str(e))
        explanation = "Не удалось сгенерировать объяснение. Попробуйте позже."

    duration_ms = round((time.monotonic() - t0) * 1000)
    log.debug(
        "explainer_done",
        listings=len(scored_listings),
        business_type=business_type,
        duration_ms=duration_ms,
        explanation_length=len(explanation),
    )

    return explanation


async def explainer_node(state: dict) -> dict:
    """LangGraph node: generate Russian explanations for top scored listings.

    Follows the node contract: async def, returns only updated keys, never raises.
    """
    try:
        await update_pipeline_step(state["search_id"], "explaining")
    except Exception:
        pass
    t0 = time.monotonic()
    errors: list[str] = []

    # Explain the top validated listings (cap at 10 for LLM context)
    top = state.get("top_listings", []) or state.get("scored_listings", [])
    top = top[:10]
    if not top:
        errors.append("explainer_node: no listings to explain")
        return {
            "explanation": "",
            "errors": errors,
        }

    # Enrich with business profile from search query
    search_query = state.get("search_query") or {}
    bp = search_query.get("business_profile", {})
    business_label = state.get("business_type", "")
    if bp.get("concept"):
        business_label = f"{business_label} — {bp['concept']}"
    if bp.get("name"):
        business_label = f"«{bp['name']}» ({business_label})"

    try:
        explanation = await generate_explanation(
            top,
            business_label,
            planner_reasoning=state.get("planner_reasoning", ""),
            validation_results=state.get("validation_results"),
        )
    except Exception as e:
        errors.append(f"explainer_node: {e}")
        explanation = "Не удалось сгенерировать объяснение."

    log.debug(
        "explainer_node_done",
        listings=len(top),
        errors=len(errors),
        duration_ms=round((time.monotonic() - t0) * 1000),
    )

    return {
        "explanation": explanation,
        "errors": errors,
    }
