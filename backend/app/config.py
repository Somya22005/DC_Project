import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name = "BitSecure Adaptive Quiz API"
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    # Llama 3.3 70B was deprecated for developer-tier usage on Groq.
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    allowed_origins = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5500,http://127.0.0.1:5500",
        ).split(",")
        if origin.strip()
    ]
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")


@lru_cache
def get_settings():
    return Settings()
