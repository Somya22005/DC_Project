# BitSecure FastAPI backend

Python implementation of the adaptive quiz API. Existing endpoint contract is retained:

- `GET /health`
- `POST /api/quiz/start`
- `POST /api/quiz/submit`
- `GET /api/quiz/profile`

All quiz routes require `Authorization: Bearer <Firebase ID token>`. Correct answers and explanations are kept server-side until submission.

## Setup

Python 3.10+:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`: provide a Groq API key, exact frontend origins, and Firebase Admin credentials. Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of your private service-account JSON file. Never commit credentials.

Run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 4320
```

Docs: http://localhost:4320/docs ; health: http://localhost:4320/health

Set `window.BITSECURE_API_URL` in `js/config.js` to the deployed API base URL (no trailing slash). The frontend must send the signed-in Firebase user's ID token.

## Firestore

- Course progress: `users/{uid}/progress/overview` (`progress` field)
- Adaptive profile: `users/{uid}/adaptiveQuiz/profile`
- Private sessions: `users/{uid}/adaptiveQuiz/sessions/{sessionId}`

Each generated batch contains exactly eight validated MCQs. Scoring is performed server-side.
