from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    gemini_maps_model: str = "gemini-2.5-flash"
    gemini_api_key: str
    twogis_api_key: str
    redis_url: str
    celery_broker_url: str
    environment: str = "development"
    secret_key: str

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


settings = Settings()
