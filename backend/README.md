# BitSecure Adaptive Quiz API

Groq-powered, batch-based adaptive quizzes (8 questions per batch).

## Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and add `GROQ_API_KEY`.
3. Configure Firebase Admin credentials with `FIREBASE_SERVICE_ACCOUNT_JSON` or Application Default Credentials.
4. Set `ALLOWED_ORIGINS` to the exact deployed frontend origin(s).
5. Run `npm install`, then `npm start`.
6. Set `window.BITSECURE_API_URL` in `js/config.js` to the deployed API base URL (for example, `https://your-api.example.com`; no trailing slash). Leave it empty to keep using the existing local question bank.

The API reads course progress from Firestore at `users/{uid}/progress/overview`. It stores adaptive quiz performance separately at `users/{uid}/adaptiveQuiz/profile`. Never commit `.env`, service-account JSON, or API keys.

## Endpoints

- `GET /health`
- `POST /api/quiz/start` — read hybrid course progress and generate exactly eight questions.
- `POST /api/quiz/submit` — submit the eight selected option indexes and update topic performance.
- `GET /api/quiz/profile` — return course and adaptive progress.

All quiz routes require a Firebase ID token in `Authorization: Bearer <token>`.

## Hybrid completion model

A topic's estimated completion combines module activity (35%), completed guided tutorial evidence (25%), and assessment performance (40%). Unstarted topics are not eligible for question generation. Existing progress records remain compatible; absent evidence contributes zero rather than being treated as completed.

## Deployment note

Deploy this backend as a separate Node service (for example, a managed container or Node hosting platform). Set `BITSECURE_API_URL` in the frontend runtime to its HTTPS base URL. The local network-interface helper is independent and remains unchanged.
