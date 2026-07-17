# ScamShield AI

An explainable AI scam-message detector built as a third-year portfolio project. Paste an SMS or WhatsApp message to get a **SCAM / LEGIT** verdict, confidence score, risk level, plain-English warning signals, and persistent history.

![Stack](https://img.shields.io/badge/stack-Flask%20%2B%20React-111111) ![NLP](https://img.shields.io/badge/NLP-TF--IDF%20%2B%20Logistic%20Regression-b8ff42)

## Highlights

- Real NLP pipeline: word + character TF-IDF and logistic regression
- Explainable rule layer for links, urgency, payments, credential requests, threats, and remote access
- REST API with validation, CORS, JSON errors, and security headers
- SQLite scan history with delete-one and clear-all actions
- Original responsive React interface with custom AI-generated project artwork
- India-aware examples for KYC, UPI, fake jobs, parcels, lotteries, and impersonation

## Project structure

```text
scam-detector/
├── backend/
│   ├── app.py          # Flask routes + SQLite persistence
│   └── model.py        # NLP training, inference, and explanations
├── frontend/
│   ├── public/         # Original project imagery
│   └── src/            # React UI and responsive CSS
├── requirements.txt
└── README.md
```

## Run locally

### 1. Start the Flask API

```bash
cd scam-detector
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python backend/app.py
```

The API runs at `http://localhost:5000`.

### 2. Start the React frontend

Open a second terminal:

```bash
cd scam-detector/frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service and model status |
| `POST` | `/api/analyze` | Analyze `{ "message": "..." }` |
| `GET` | `/api/history?limit=20` | Get recent scans and totals |
| `DELETE` | `/api/history/:id` | Delete one scan |
| `DELETE` | `/api/history` | Clear all history |

Example:

```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"Urgent! Your KYC expires today. Click this link and share OTP."}'
```

## How the model works

1. A small labelled seed corpus is vectorised from two views: word 1–2 grams and character 3–5 grams.
2. Logistic regression estimates scam probability.
3. A deterministic rule layer identifies high-risk patterns and creates explanations.
4. The scores are blended; the UI shows both the final confidence and the evidence.

This makes the project easy to run locally and discuss in an interview. For production, replace the seed corpus with a larger reviewed dataset, calibrate probabilities on a held-out test set, add multilingual support, and avoid retaining raw messages by default.

## Test and evaluate

```bash
pip install -r requirements-dev.txt
pytest -q
python backend/evaluate.py
```

`evaluate.py` runs a stratified 5-fold baseline on the bundled seed corpus. Treat it as a development check—not a production performance claim.

## Resume bullets

- Built an explainable scam-message classifier using dual TF-IDF features and logistic regression, augmented with a transparent risk-signal engine for phishing, credential theft, and payment-pressure patterns.
- Designed a Flask REST API with SQLite persistence, input validation, CORS, security headers, and complete history-management endpoints.
- Developed an original responsive React interface featuring confidence visualisation, evidence-based results, sample scenarios, scan history, and custom editorial artwork.

## Responsible-use note

ScamShield is a learning project and decision-support tool, not a guarantee. Users should verify high-stakes requests through official apps, websites, or phone numbers and never share an OTP, PIN, CVV, or password.
