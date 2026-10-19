import asyncio
import random
import time
from abc import ABC, abstractmethod

import httpx
import structlog

log = structlog.get_logger()

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
]

# Anti-bot / rate-limit answers. Krisha uses a non-standard 468 for "slow down".
BLOCK_STATUSES = (403, 429, 468)


class ScraperBlocked(RuntimeError):
    """The source kept refusing requests after backing off."""


class BaseScraper(ABC):
    """Abstract base scraper: serialized, jittered pacing, one session, backoff on blocks.

    All requests of one scraper instance go through a single pacer, so concurrent callers
    can never burst. A block response (468/429/403) is retried after an increasing pause
    instead of switching the scraper off for the rest of the run.
    """

    MIN_DELAY: float = 1.6  # seconds between request starts
    JITTER: float = 0.8     # extra random delay, avoids a fixed request rhythm
    MAX_RETRIES: int = 3
    BLOCK_BACKOFF: tuple[float, ...] = (8.0, 20.0, 45.0)
    TIMEOUT: float = 20.0

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._pace_lock = asyncio.Lock()
        self._last_request_at = 0.0

    async def __aenter__(self) -> "BaseScraper":
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    def _session(self) -> httpx.AsyncClient:
        # One session per scraper keeps cookies, which looks like a normal browsing visit.
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={"User-Agent": self._random_ua(), "Accept-Language": "ru-RU,ru;q=0.9"},
                timeout=self.TIMEOUT,
                follow_redirects=True,
            )
        return self._client

    async def _pace(self) -> None:
        async with self._pace_lock:
            wait = self._last_request_at + self.MIN_DELAY + random.uniform(0, self.JITTER) - time.monotonic()
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_request_at = time.monotonic()

    async def get(self, url: str, **kwargs) -> httpx.Response:
        """GET with pacing, backoff on block responses and retries on transient errors."""
        last_error: Exception | None = None
        blocks = 0
        attempt = 0
        while attempt < self.MAX_RETRIES + len(self.BLOCK_BACKOFF):
            attempt += 1
            await self._pace()
            try:
                resp = await self._session().get(url, **kwargs)
            except httpx.RequestError as e:
                last_error = e
                wait = 2 ** min(attempt, 4)
                log.warning("scraper_request_retry", scraper=type(self).__name__, url=url, attempt=attempt, error=str(e), wait_s=wait)
                await asyncio.sleep(wait)
                continue

            if resp.status_code in BLOCK_STATUSES:
                if blocks >= len(self.BLOCK_BACKOFF):
                    break
                wait = self.BLOCK_BACKOFF[blocks]
                blocks += 1
                last_error = ScraperBlocked(f"Source denied requests (HTTP {resp.status_code})")
                log.warning("scraper_blocked_backoff", scraper=type(self).__name__, status=resp.status_code, wait_s=wait, block=blocks)
                await asyncio.sleep(wait)
                continue

            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                last_error = e
                if resp.status_code < 500:
                    raise
                await asyncio.sleep(2 ** min(attempt, 4))
                continue
            return resp

        raise last_error or ScraperBlocked("Source unavailable")

    @abstractmethod
    async def fetch_commercial_listings(
        self, district: str | None = None
    ) -> list[dict]:
        """Fetch commercial listings. Must be implemented by subclasses."""
        ...

    def _random_ua(self) -> str:
        return random.choice(USER_AGENTS)
