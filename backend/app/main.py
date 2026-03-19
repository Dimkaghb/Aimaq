from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: init DB client, Redis pool. Shutdown: close connections."""
    log.info("app_starting")
    yield
    log.info("app_shutting_down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="LocationIQ API",
        description="AI-powered commercial real estate finder for Almaty",
        version="1.0.0",
        lifespan=lifespan,
    )

    @app.get("/api/v1/health", status_code=200)
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
