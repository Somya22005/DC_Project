import os
from functools import lru_cache
from dotenv import load_dotenv
load_dotenv()

class Settings:
    app_name = "BitSecure Adaptive Quiz API"
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    allowed_origins = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",") if x.strip()]
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

@lru_cache
def get_settings():
    return Settings()
