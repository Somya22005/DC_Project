# BitSecure FastAPI backend

Python implementation of the adaptive quiz API and the floating Data Communications AI tutor.

## Endpoints

- `GET /health`
- `POST /api/quiz/start`
- `POST /api/quiz/submit`
- `GET /api/quiz/profile`
- `POST /api/assistant/chat` — authenticated Data Communications and Computer Networks tutor

All quiz and assistant routes require `Authorization: Bearer <Firebase ID token>`. The assistant calls Groq using `openai/gpt-oss-120b` by default. Llama 3.3 70B is no longer the default because Groq deprecated it for developer-tier usage.

## Requirements

- Python 3.10 or newer
- A Groq API key
- A Firebase Admin service-account JSON file for verifying Firebase ID tokens and accessing Firestore

## Windows PowerShell setup

From the repository root:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

If PowerShell blocks virtual-environment activation, run this in the same terminal and activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Linux / macOS setup

From the repository root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
nano .env
```

## Environment configuration

In `backend/.env`, set:

- `GROQ_API_KEY`: a newly created key from https://console.groq.com/keys
- `GROQ_MODEL=openai/gpt-oss-120b`
- `ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500`
- `GOOGLE_APPLICATION_CREDENTIALS`: absolute path to your Firebase Admin service-account JSON file

Use forward slashes in Windows paths, for example `C:/Users/YourUsername/Downloads/firebase-admin.json`. Do not paste credentials into source files or commit `.env` / service-account JSON.

## Run locally

Terminal 1 — from the `backend` directory, with the virtual environment active:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 4320
```

Check http://127.0.0.1:4320/health and http://127.0.0.1:4320/docs.

Terminal 2 — from the repository root:

```bash
python -m http.server 5500
```

Open http://localhost:5500. In `js/config.js`, set:

```javascript
window.BITSECURE_API_URL = 'http://127.0.0.1:4320';
```

The frontend must be opened through the local HTTP server (not by double-clicking `index.html`). Sign in with Firebase before using the assistant.

## Firestore paths

- Course progress: `users/{uid}/progress/overview` (`progress` field)
- Adaptive profile: `users/{uid}/adaptiveQuiz/profile`
- Private sessions: `users/{uid}/adaptiveQuizSessions/{sessionId}`

Each generated quiz batch contains exactly eight validated MCQs. Scoring is performed server-side.
