# ScamShield AI — Complete Project Walkthrough

This document explains what the project does, how one scan travels through the system, and what every source file is responsible for.

## 1. Project in one sentence

ScamShield AI is a full-stack web application that accepts an SMS or WhatsApp message, estimates whether it is a scam, explains the warning signals behind that decision, and saves the result in local history.

It uses:

- **React + Vite** for the browser interface
- **Flask** for the REST API
- **scikit-learn** for NLP and classification
- **SQLite** for scan history
- **CSS** for the responsive agency-style interface

It is real machine learning, but it is not an LLM and does not call ChatGPT or another external AI service.

---

## 2. High-level architecture

```text
┌──────────────────── Browser ────────────────────┐
│ React interface                                │
│  • message textarea                            │
│  • result and confidence                       │
│  • warning signals                             │
│  • history controls                            │
└──────────────────────┬─────────────────────────┘
                       │ HTTP + JSON
                       │ POST /api/analyze
                       ▼
┌──────────────────── Flask API ──────────────────┐
│  • validates input                             │
│  • calls NLP model                             │
│  • stores scan                                 │
│  • returns JSON                                │
└───────────────┬─────────────────┬───────────────┘
                │                 │
                ▼                 ▼
       ┌── NLP detector ──┐  ┌── SQLite ──┐
       │ TF-IDF           │  │ scans table│
       │ Logistic Reg.    │  │ history    │
       │ Regex rule layer │  └────────────┘
       └──────────────────┘
```

During development, the React app normally runs on port **5173** and Flask runs on port **5000**.

---

## 3. What happens when the applications start

### Backend startup

1. Python executes `backend/app.py`.
2. Flask creates the application object.
3. Flask-CORS allows the frontend to call `/api/*`.
4. `init_db()` creates `backend/scamshield.db` if it does not exist.
5. The `scans` table is created if needed.
6. Flask starts listening on port 5000.
7. The NLP model is not trained yet. It is created lazily on the first scan.

### Frontend startup

1. Vite reads `frontend/index.html`.
2. The browser loads `src/main.jsx`.
3. `main.jsx` mounts the root `App` component.
4. `App.jsx` renders the header, hero, detector, process, history, technology, FAQ, and footer sections.
5. `HistorySection` requests existing history from Flask.

---

## 4. Complete scan flow

Suppose the user pastes:

```text
URGENT! Your KYC expires today. Click http://bit.ly/fake and share OTP now.
```

### Step 1 — React captures the text

The textarea in the `Scanner` component stores the text in React state:

```jsx
const [message, setMessage] = useState("");
```

`onChange` updates this state every time the user types.

### Step 2 — Frontend sends an API request

When **Analyze message** is clicked, `Scanner.analyze()` sends:

```http
POST http://localhost:5000/api/analyze
Content-Type: application/json
```

```json
{
  "message": "URGENT! Your KYC expires today..."
}
```

The frontend also activates the loading animation and clears any older error.

### Step 3 — Flask validates the request

`backend/app.py`:

1. Reads the JSON body.
2. Removes leading and trailing spaces.
3. Rejects an empty message.
4. Rejects text under 4 characters.
5. Rejects text over 5,000 characters.

Invalid requests receive HTTP `400` and a JSON error.

### Step 4 — The detector is loaded

`get_detector()` returns the existing detector. On the first request only, it creates `ScamDetector()` and trains the classifier.

The singleton avoids retraining the model for every message.

### Step 5 — TF-IDF converts text into numbers

Machine-learning algorithms cannot directly understand raw words. TF-IDF creates numerical features.

The detector uses two feature views:

1. **Word n-grams (1–2 words)**
   - Finds tokens such as `urgent`, `share otp`, `bank account`, and `processing fee`.
2. **Character n-grams (3–5 characters)**
   - Finds smaller character patterns.
   - Helps with spelling variation, suspicious domains, and words like `verify`, `bit.ly`, or misspelled brand names.

`FeatureUnion` combines both feature matrices into one large input for the classifier.

### Step 6 — Logistic Regression predicts probability

The Logistic Regression classifier was trained with 96 bundled examples:

- 48 scam examples labelled `1`
- 48 legitimate examples labelled `0`

`predict_proba()` returns the estimated probability that the new message belongs to class `1`.

Example:

```text
ML scam probability = 0.86
```

### Step 7 — Explainable rules look for safety signals

The `_signals()` method uses regular expressions to detect patterns including:

- suspicious or shortened links
- OTP, PIN, CVV, password, or seed phrase requests
- urgent or pressuring language
- lottery and prize claims
- payment or processing-fee requests
- threats of blocking, arrest, or disconnection
- KYC, Aadhaar, PAN, and bank identity terms
- unrealistic investment promises
- remote access applications
- identity manipulation such as “my phone is broken”

There are also safe patterns. For example, “Do not share your OTP” and “open the official app” reduce the rule score.

The function returns up to five human-readable signals plus a rule score between 0 and 1.

### Step 8 — ML and rules are blended

The final scam probability is:

```text
final probability = 72% ML probability + 28% rule score
```

In code:

```python
scam_probability = (0.72 * ml_probability) + (0.28 * rule_score)
```

The final value is limited to 2–98% so the small model never pretends to have absolute certainty.

### Step 9 — Verdict, risk, and confidence are calculated

- Probability `>= 50%` → `SCAM`
- Probability `< 50%` → `LEGIT`

Risk levels:

- `>= 72%` → High
- `45–71.9%` → Medium
- `< 45%` → Low

Confidence means confidence in the displayed verdict:

```text
If SCAM:  confidence = scam probability
If LEGIT: confidence = 100% - scam probability
```

This is why a message with 20% scam probability is shown as `LEGIT` with 80% confidence.

### Step 10 — Result is stored in SQLite

Flask inserts the following into the `scans` table:

- original message
- verdict
- confidence
- scam probability
- risk level
- UTC timestamp

SQL placeholders (`?`) are used instead of joining text into SQL, which prevents SQL injection through the message.

### Step 11 — Flask returns JSON

A response looks like:

```json
{
  "id": 1,
  "message": "URGENT! Your KYC expires today...",
  "verdict": "SCAM",
  "confidence": 78.6,
  "scam_probability": 78.6,
  "risk_level": "High",
  "signals": [
    {
      "label": "Suspicious link",
      "detail": "Contains a link or downloadable file...",
      "kind": "risk"
    }
  ],
  "advice": "Do not reply, tap links, share credentials, or send money.",
  "model_probability": 86.7,
  "created_at": "2026-07-16T09:46:00+00:00"
}
```

The endpoint returns HTTP `201` because a new history record was created.

### Step 12 — React renders the result

`ResultCard` displays:

- likely scam / looks legitimate heading
- circular confidence indicator
- verdict
- risk level
- scam probability
- evidence list
- safety advice
- reset button

The app increments `historyRefresh`, causing `HistorySection` to fetch the latest database records.

---

## 5. Backend files

### `backend/model.py`

This is the machine-learning and explanation layer.

#### `SCAM_MESSAGES` and `LEGIT_MESSAGES`

These lists are the bundled training corpus. They cover Indian and general scam scenarios such as KYC, UPI, lotteries, fake jobs, parcels, impersonation, loan threats, investment fraud, and remote access.

The legitimate list includes appointments, delivery confirmations, student notices, OTP safety notices, meetings, payments, and personal messages.

#### `Signal` dataclass

A signal stores:

- `label`: short title
- `detail`: user-friendly explanation
- `weight`: effect on rule score
- `kind`: `risk` or `safe`

`as_dict()` prepares the signal for a JSON response.

#### `ScamDetector.__init__()`

- Creates word and character TF-IDF vectorizers.
- Combines them with `FeatureUnion`.
- Gives scam samples label `1` and legitimate samples label `0`.
- Fits Logistic Regression.

Important classifier settings:

- `max_iter=1200`: enough optimisation iterations
- `C=3.0`: regularisation setting
- `class_weight="balanced"`: protects against class imbalance if the corpus changes
- `random_state=42`: reproducibility

#### `_signals()`

- Lowercases the message.
- Runs each regex pattern.
- Adds matched signals and weights.
- Subtracts weight for safety wording.
- Limits the output to five signals.
- Clamps the rule score to 0–1.

#### `analyze()`

- Vectorises one incoming message.
- gets ML scam probability.
- gets rules and explanation signals.
- blends the scores.
- calculates verdict, confidence, and risk.
- returns a Python dictionary ready for JSON.

#### `get_detector()`

Implements a simple singleton. The model is trained once per Python process instead of once per request.

### `backend/app.py`

This is the HTTP and database layer.

#### Configuration

- `DB_PATH` can come from `SCAMSHIELD_DB`; otherwise it uses `backend/scamshield.db`.
- `MAX_MESSAGE_LENGTH` is 5,000 characters.
- `FRONTEND_ORIGIN` controls CORS.

#### `get_db()`

Opens a SQLite connection and enables named-column access with `sqlite3.Row`.

#### `init_db()`

Creates the database directory and the `scans` table.

#### `serialize_scan()`

Converts one SQLite row to a regular dictionary for JSON.

#### Security headers

Every response receives:

- `X-Content-Type-Options: nosniff`
- a `Content-Security-Policy` that allows embedding only by the app itself and Hugging Face
- a strict referrer policy

The older `X-Frame-Options: DENY` setting is intentionally not used because Hugging Face displays Spaces inside an iframe.

#### API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Confirms service and model name |
| POST | `/api/analyze` | Validates, analyzes, stores, and returns one message |
| GET | `/api/history?limit=20` | Returns newest scans and summary totals |
| DELETE | `/api/history/:id` | Deletes one record |
| DELETE | `/api/history` | Deletes all history |

The history limit is clamped between 1 and 100.

#### Error handlers

Unknown endpoints return a JSON 404. Unhandled server errors return a generic JSON 500 response rather than an HTML error page.

### `backend/evaluate.py`

This creates a complete scikit-learn pipeline and runs stratified 5-fold cross-validation on the seed corpus.

It prints:

- accuracy
- precision
- recall
- F1 score

The current development baseline is approximately 89.6% accuracy and 89.8% F1, but this is only a small seed-corpus result and must not be presented as production accuracy.

---

## 6. Frontend files

### `frontend/index.html`

The single HTML shell used by Vite. It provides:

- page metadata
- mobile viewport configuration
- description and title
- `<div id="root"></div>` for React
- script that loads `src/main.jsx`

### `frontend/src/main.jsx`

The React entry point. It:

1. imports React and ReactDOM
2. imports `App`
3. imports global CSS
4. renders `<App />` inside the root element
5. uses `React.StrictMode` to highlight development problems

### `frontend/src/App.jsx`

This contains the page components and browser-side logic.

#### `API_BASE`

Uses three levels: `VITE_API_URL` for conventional deployments, the Hugging Face Static Space variable `window.huggingface.variables.API_BASE_URL` for the free live demo, and finally relative `/api` URLs for local Vite development. Vite proxies local `/api` requests to Flask on port 5000.

#### `examples`

Three clickable demo messages: KYC scam, prize scam, and legitimate delivery update.

#### `faqs`

Question-and-answer content for the accordion section.

#### `Logo`

Reusable ScamShield logo used in the header and footer.

#### `Header`

Fixed navigation with desktop links, scan CTA, and mobile menu state.

#### `Eyebrow`

Reusable small numbered section label.

#### `Hero`

The opening section with oversized headline, CTA, project description, generated security image, floating labels, and scam-category ticker.

#### `EmptyResult`

The detector's waiting state. It shows a radar animation until the first result arrives.

#### `ResultCard`

Accepts a result object and renders its confidence ring, verdict, metrics, signals, advice, and reset action. Styling changes for scam and legitimate results.

#### `Scanner`

This is the primary interactive frontend component.

State:

- `message`: textarea content
- `result`: API result or null
- `loading`: whether a request is running
- `error`: validation/network message
- `copied`: temporary clipboard feedback

Main methods:

- `analyze()`: POSTs the message to Flask
- `useExample()`: loads a sample message
- `pasteFromClipboard()`: reads browser clipboard text
- `reset()`: clears the current scan

#### `ProcessCard` and `HowItWorks`

Reusable presentation cards explaining input, model processing, and evidence-based output.

#### `MetricStrip`

Displays project implementation facts such as two n-gram views, risk signals, zero cloud AI calls, and typical local speed.

#### `HistorySection`

State:

- history records
- summary totals
- loading status
- error text

Methods:

- `loadHistory()`: GET history
- `deleteItem(id)`: DELETE one item
- `clearAll()`: DELETE every item after confirmation

It calculates the flagged percentage from the API summary and renders responsive history rows.

#### `TechSection`

Explains the resume-relevant technology: explainable NLP, Flask API, and SQLite history.

#### `FAQ`

Uses state to track which answer is open.

#### `Footer`

Large final CTA, project identity, stack, and navigation links.

#### Root `App`

- keeps a `historyRefresh` number
- gives the refresh callback to `Scanner`
- gives the number to `HistorySection`
- uses `IntersectionObserver` to add entrance animations as sections enter the viewport
- renders the complete page in order

### `frontend/src/styles.css`

The complete visual system:

- colour variables for black, off-white, acid green, danger, and safe states
- typography and spacing
- fixed glass-effect navigation
- oversized editorial hero
- ticker animation
- dark scanner workspace
- textarea, loading, result, and confidence styling
- process cards and image effects
- history table and badges
- technology, FAQ, and footer layouts
- intersection animations
- breakpoints for desktop, tablet, and mobile
- reduced-motion accessibility rule

The design is inspired by the bold editorial agency feel of the supplied reference but uses original layout, content, colour treatment, and project artwork.

### `frontend/public/`

Static original AI-generated images:

- `shield-orbit.png`: hero and safety artwork
- `message-scan.png`: phone and chat-message scanning artwork
- `privacy-core.png`: local/private processing artwork

Vite copies these files into the production build.

### `frontend/package.json`

Contains project metadata, scripts, and dependencies.

Scripts:

- `npm run dev`: starts Vite development server
- `npm run build`: creates production files in `dist/`
- `npm run preview`: previews the production build

Main dependencies:

- React
- ReactDOM
- Vite
- Vite React plugin
- Lucide React icons

### `frontend/package-lock.json`

Locks exact npm package versions so other computers install a reproducible dependency tree. It is generated by npm and should normally not be manually edited.

### `frontend/vite.config.js`

Enables the official React plugin and fixes the local frontend server port at 5173.

### `frontend/.env.example`

Documents the frontend environment variable:

```env
VITE_API_URL=http://localhost:5000
```

For deployment, replace it with the public Flask API URL.

---

## 7. Root and test files

### `requirements.txt`

Production Python dependencies:

- Flask
- Flask-Cors
- scikit-learn
- Gunicorn

### `requirements-dev.txt`

Includes production packages plus pytest for development tests.

### `tests/test_api.py`

Uses Flask's test client, so tests do not need a real HTTP server.

It tests:

1. health endpoint
2. an explainable scam result
3. a legitimate result and saved history
4. rejection of an empty message

It changes `SCAMSHIELD_DB` to a test-only database before importing the app.

### Root `package.json`

Defines `npm run build:space` for the free Hugging Face Static Space. It installs the frontend packages, builds the Vite app, and copies the output to root `dist/` for static hosting.

### `requirements-pythonanywhere.txt`

Uses compatible dependency ranges so a free PythonAnywhere virtual environment can reuse its preinstalled scientific Python packages and conserve disk space.

### `Dockerfile`

An optional portable deployment using two stages: Node compiles React, then Python runs Flask/scikit-learn and the compiled site through Gunicorn. Docker is not used by the recommended free deployment because it is marked paid on some Hugging Face accounts.

### `.dockerignore`

Keeps `.venv`, `node_modules`, local builds, databases, tests, caches, and secrets out of an optional Docker build context.

### `HF_DEPLOYMENT.md`

The complete no-card deployment guide: Hugging Face Static hosts React, while a PythonAnywhere Beginner web app runs Flask, scikit-learn, SQLite, and the API.

### `render.yaml`

An optional Render configuration retained for reference. It is not required for the recommended Hugging Face deployment.

### `.gitignore`

Prevents generated and private development files from entering Git, including virtual environments, Node modules, builds, local databases, editor metadata, and environment files.

### `README.md`

Quick project documentation: features, setup, API table, model summary, test commands, resume bullets, and responsible-use note.

---

## 8. Database design

Table: `scans`

| Column | Type | Meaning |
|---|---|---|
| id | INTEGER | auto-incrementing primary key |
| message | TEXT | original message |
| verdict | TEXT | SCAM or LEGIT |
| confidence | REAL | confidence in displayed verdict |
| scam_probability | REAL | estimated chance of scam |
| risk_level | TEXT | Low, Medium, or High |
| created_at | TEXT | UTC ISO timestamp |

The database file is generated automatically and ignored by Git.

---

## 9. How to run it

### Terminal 1 — Backend

```bash
cd scam-detector
python -m venv .venv
```

Activate it:

```bash
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install and run:

```bash
pip install -r requirements.txt
python backend/app.py
```

Backend: `http://localhost:5000`

### Terminal 2 — Frontend

```bash
cd scam-detector/frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

### Run tests

```bash
cd scam-detector
pip install -r requirements-dev.txt
pytest -q
python backend/evaluate.py
```

---

## 10. How to explain it in an interview

A concise explanation:

> ScamShield is an explainable full-stack NLP application. The React frontend sends a suspicious message to a Flask REST API. The backend converts the text into word and character TF-IDF features and uses Logistic Regression to estimate scam probability. I blend that prediction with a transparent regular-expression safety layer so the product can explain signals such as urgency, suspicious links, OTP requests, and payment pressure. The result is stored in SQLite and shown with a verdict, confidence, risk level, evidence, and history controls.

Why Logistic Regression:

> It is fast, interpretable, strong for sparse TF-IDF text features, and suitable for a third-year project that must run locally without a GPU or paid API.

Why a hybrid model:

> Pure ML can identify learned wording, while deterministic rules improve explainability and catch high-risk patterns. The combination is easier to justify than presenting a black-box label.

Why both word and character features:

> Word n-grams capture phrases such as “processing fee,” while character n-grams are more robust to spelling variation, abbreviations, and suspicious URL fragments.

---

## 11. Honest limitations

Do not claim that this system guarantees scam detection.

Current limitations:

- small hand-curated seed dataset
- primarily English text
- no authentication or separate histories per user
- raw messages are stored locally in SQLite
- probability is not calibrated on a large independent dataset
- regex patterns cannot understand every context
- SQLite on some free cloud hosts may be ephemeral
- no image, voice, QR-code, or attachment analysis
- no automated retraining pipeline

These limitations are normal for a student project when stated honestly.

---

## 12. Strong future improvements

1. Train on a larger independently reviewed dataset.
2. Add Hindi, Marathi, and Hinglish support.
3. Use calibrated probabilities and a separate untouched test set.
4. Add user accounts and private per-user history.
5. Hash, redact, encrypt, or avoid storing sensitive raw message content.
6. Add URL-domain reputation checks in a safe backend service.
7. Add OCR for scam screenshots.
8. Add model/version monitoring and feedback-based retraining.
9. Store production data in PostgreSQL.
10. Add Docker, CI/CD, rate limiting, and authentication.

The best next step for resume impact would be multilingual support plus deployment with a public demo URL.
