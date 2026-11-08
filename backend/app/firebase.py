import json, os
from functools import lru_cache
import firebase_admin
from firebase_admin import auth, credentials, firestore
from app.config import get_settings

@lru_cache
def get_db():
    if not firebase_admin._apps:
        s = get_settings()
        if s.service_account_json:
            try: cred = credentials.Certificate(json.loads(s.service_account_json))
            except json.JSONDecodeError as exc: raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.") from exc
        elif s.credentials_path:
            if not os.path.isfile(s.credentials_path): raise RuntimeError(f"Firebase credentials file not found: {s.credentials_path}")
            cred = credentials.Certificate(s.credentials_path)
        else: cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
    return firestore.client()

def verify_token(token: str):
    try: return auth.verify_id_token(token, check_revoked=True)
    except Exception as exc: raise ValueError("Invalid or expired Firebase ID token.") from exc
