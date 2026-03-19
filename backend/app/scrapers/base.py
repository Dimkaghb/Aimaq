import asyncio
import random
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


class BaseScraper(ABC):
    """Abstract base scraper with rate limiting, rotating UA, and retry logic."""

    MIN_DELAY: float = 2.0  # seconds between requests — respect robots.txt
    MAX_RETRIES: int = 3
    TIMEOUT: float = 15.0

    def __init__(self) -> None:
        self._consecutive_failures: int = 0
        self._disabled: bool = False

    async def get(self, url: str, **kwargs: dict) -> httpx.Response:
        """Make a GET request with rate limiting, rotating UA, and retries."""
        if self._disabled:
            log.warning("scraper_disabled", scraper=self.__class__.__name__)
            raise RuntimeError(f"Scraper {self.__class__.__name__} is disabled after 3 failures")

        last_error: Exception | None = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(
                    headers={"User-Agent": self._random_ua()},
                    timeout=self.TIMEOUT,
                    follow_redirects=True,
                ) as client:
                    await asyncio.sleep(self.MIN_DELAY)
                    resp = await client.get(url, **kwargs)
                    resp.raise_for_status()
                    self._consecutive_failures = 0
                    return resp
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                last_error = e
                wait = 2**attempt
                log.warning(
                    "scraper_request_retry",
                    scraper=self.__class__.__name__,
                    url=url,
                    attempt=attempt,
                    error=str(e),
                    wait_s=wait,
                )
                await asyncio.sleep(wait)

        self._consecutive_failures += 1
        if self._consecutive_failures >= 3:
            self._disabled = True
            log.error(
                "scraper_disabled_after_failures",
                scraper=self.__class__.__name__,
                consecutive_failures=self._consecutive_failures,
            )
        raise last_error  # type: ignore[misc]

    @abstractmethod
    async def fetch_commercial_listings(
        self, district: str | None = None
    ) -> list[dict]:
        """Fetch commercial listings. Must be implemented by subclasses."""
        ...

    def _random_ua(self) -> str:
        return random.choice(USER_AGENTS)
