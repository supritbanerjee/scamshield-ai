# Completely Free Deployment — Hugging Face Static + PythonAnywhere Flask

Docker Spaces are marked paid for some Hugging Face accounts. Do **not** select Docker or enter card details. This project therefore uses two genuinely separate services:

```text
Hugging Face Static Space             PythonAnywhere Beginner web app
React + Vite website        ───────▶   Flask API + NLP + SQLite
FREE static hosting                    FREE Python web app
```

The result is still the complete original website. Only the hosting is split.

## Files that make this work

- Root `README.md`: tells Hugging Face to use `sdk: static`, run the build, and serve `dist/index.html`.
- Root `package.json`: installs/builds the `frontend` project and copies its output to root `dist/`.
- `frontend/src/App.jsx`: reads the backend URL from the Space variable `API_BASE_URL`.
- `requirements-pythonanywhere.txt`: dependency ranges that can reuse PythonAnywhere's installed scientific packages.
- `backend/app.py`: Flask API and SQLite history.

---

# Part A — Put the updated code on GitHub

From your local project root:

```powershell
cd "D:\AI Projects\scamshield-ai-project\scam-detector"
git add .
git commit -m "Add free Hugging Face Static and PythonAnywhere deployment"
git push
```

Confirm GitHub contains:

```text
package.json
requirements-pythonanywhere.txt
HF_DEPLOYMENT.md
backend/
frontend/
```

Do not upload `.venv`, `node_modules`, `dist`, `.env`, or `scamshield.db`.

---

# Part B — Create the free Hugging Face Static Space

1. Sign in at <https://huggingface.co>.
2. Open <https://huggingface.co/new-space>.
3. Enter:
   - **Space name:** `scamshield-ai`
   - **Short description:** `Explainable scam-message detector built with React, Flask and NLP`
   - **License:** MIT
   - **Visibility:** Public
   - **SDK:** **Static** — not Gradio and not paid Docker
   - **Template:** Blank
4. Click **Create Space**.

The root README metadata in this project is already configured as:

```yaml
---
title: ScamShield AI
emoji: 🛡️
colorFrom: green
colorTo: gray
sdk: static
app_build_command: npm run build:space
app_file: dist/index.html
---
```

Your Space page will be:

```text
https://huggingface.co/spaces/YOUR_HF_USERNAME/scamshield-ai
```

The direct frontend domain will normally be:

```text
https://YOUR-HF-USERNAME-scamshield-ai.hf.space
```

Keep that direct URL for the CORS configuration below.

---

# Part C — Deploy the Flask backend on PythonAnywhere

## 1. Create the free account

1. Open <https://www.pythonanywhere.com/registration/register/beginner/>.
2. Create a **Beginner / Free** account.
3. Do not select a paid plan or add billing details.
4. Remember your PythonAnywhere username.

Your backend will eventually be:

```text
https://YOUR_PA_USERNAME.pythonanywhere.com
```

## 2. Clone your GitHub repository

On the PythonAnywhere dashboard, open **Consoles → Bash**.

Run, replacing your GitHub username and repository name:

```bash
cd ~
git clone https://github.com/YOUR_GITHUB_USERNAME/scamshield-ai.git
cd scamshield-ai
```

If your GitHub repository has a different name, use that exact URL.

## 3. Create a small virtual environment

First check an available Python version:

```bash
python3.10 --version
```

If Python 3.10 is available, use:

```bash
python3.10 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install --no-cache-dir -r requirements-pythonanywhere.txt
```

`--system-site-packages` helps reuse PythonAnywhere's existing NumPy/SciPy/scikit-learn packages and stay inside the free disk quota.

If you selected another Python version when creating the web app, use that same version for the virtual environment.

Test imports:

```bash
python -c "import flask, flask_cors, sklearn; print('Dependencies OK', sklearn.__version__)"
```

Test the app import:

```bash
python -c "import sys; sys.path.insert(0, 'backend'); from app import app; print('Flask app OK')"
```

## 4. Create the web app

1. Open the **Web** tab.
2. Click **Add a new web app**.
3. Accept your free domain.
4. Choose **Manual configuration**.
5. Choose the same Python version used for `.venv`.
6. Finish the wizard.

## 5. Set the virtualenv

On the Web page, find **Virtualenv** and enter:

```text
/home/YOUR_PA_USERNAME/scamshield-ai/.venv
```

Use your real PythonAnywhere username.

## 6. Edit the WSGI file

On the Web page, click the WSGI configuration file link. Delete its sample content and paste:

```python
import os
import sys

PROJECT_HOME = "/home/YOUR_PA_USERNAME/scamshield-ai/backend"

if PROJECT_HOME not in sys.path:
    sys.path.insert(0, PROJECT_HOME)

# Replace this with the exact direct .hf.space URL shown by your Space.
os.environ["FRONTEND_ORIGIN"] = "https://YOUR-HF-USERNAME-scamshield-ai.hf.space"
os.environ["SCAMSHIELD_DB"] = "/home/YOUR_PA_USERNAME/scamshield-ai/backend/scamshield.db"

from app import app as application
```

Replace both types of placeholders:

- `YOUR_PA_USERNAME`
- `YOUR-HF-USERNAME`

Usernames in the `.hf.space` domain are normally lowercase and spaces become hyphens. Copy the exact direct URL from Hugging Face rather than guessing.

Save the WSGI file.

## 7. Reload and test

Return to the PythonAnywhere **Web** tab and click the green **Reload** button.

Open:

```text
https://YOUR_PA_USERNAME.pythonanywhere.com/api/health
```

Expected JSON:

```json
{
  "model": "TF-IDF + Logistic Regression",
  "service": "ScamShield AI",
  "status": "ok"
}
```

The backend root `/` may say that the frontend build is not found. That is normal: the frontend is hosted on Hugging Face. The `/api/...` routes are what matter.

If an error occurs, open the PythonAnywhere **error log** linked on the Web tab.

---

# Part D — Connect Hugging Face to PythonAnywhere

The frontend must know the public API URL.

1. Open your Hugging Face Space.
2. Go to **Settings**.
3. Find **Variables and secrets**.
4. Add a public variable:

```text
Name:  API_BASE_URL
Value: https://YOUR_PA_USERNAME.pythonanywhere.com
```

Do not add a trailing `/`.

Correct:

```text
https://rahul123.pythonanywhere.com
```

Incorrect:

```text
https://rahul123.pythonanywhere.com/
https://rahul123.pythonanywhere.com/api
http://localhost:5000
```

This is a public URL, not a password, so it belongs under **Variables**, not Secrets.

`App.jsx` reads it from:

```javascript
window.huggingface.variables.API_BASE_URL
```

---

# Part E — Upload the project to the Static Space

## 1. Create a Hugging Face write token

Open <https://huggingface.co/settings/tokens>, create a token with write permission to this Space, and copy the `hf_...` value.

Never add the token to GitHub, source code, README, `.env`, screenshots, or chat.

## 2. Install and log in with the CLI

In local PowerShell, from the project root:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -U huggingface_hub
hf auth login
```

Paste the token when asked, then verify:

```powershell
hf auth whoami
```

## 3. Upload

Replace `YOUR_HF_USERNAME` and run:

```powershell
hf upload YOUR_HF_USERNAME/scamshield-ai . . --repo-type space --commit-message "Deploy ScamShield AI static frontend"
```

The first dot means the current local folder; the second means the root of the Space repository.

Hugging Face will run:

```bash
npm run build:space
```

That command installs frontend packages, builds React, and places the output at `dist/index.html`.

## 4. Watch the build

Open the Space and inspect **Build logs**. Wait for the Static Space to finish building.

No Docker, GPU, custom hardware, or payment details are required for this route.

---

# Part F — Final testing

Open the direct Space URL and test:

1. Images and styles load.
2. KYC example returns SCAM.
3. Delivery example returns LEGIT.
4. Confidence score and signals appear.
5. History appears after a scan.
6. Delete-one works.
7. Clear All works.
8. PythonAnywhere `/api/health` still works.

Open Chrome DevTools with `F12` if something fails. In the Network tab, API requests should go to:

```text
https://YOUR_PA_USERNAME.pythonanywhere.com/api/...
```

They must not go to localhost or the `.hf.space` domain.

---

# Updating later

## Update PythonAnywhere backend

In its Bash console:

```bash
cd ~/scamshield-ai
git pull
```

Then press **Reload** on the Web tab.

## Update Hugging Face frontend

From local PowerShell:

```powershell
git add .
git commit -m "Describe the update"
git push
hf upload YOUR_HF_USERNAME/scamshield-ai . . --repo-type space --commit-message "Update ScamShield AI"
```

---

# Free-tier notes

- PythonAnywhere free apps use a `pythonanywhere.com` subdomain.
- The SQLite history is stored on PythonAnywhere and is more persistent than container-local history, but it is shared by all demo visitors.
- Free PythonAnywhere web apps may require periodic account/web-app renewal. Check the Web dashboard and press Reload if the app is disabled after a period of inactivity.
- Do not purchase custom domains, extra CPU, databases, Docker hardware, or GPU access for this student demo.

---

# Troubleshooting

## Hugging Face says `Configuration error`

Confirm `README.md` starts with `sdk: static`, `app_build_command`, and `app_file`. It must not say `sdk: docker`.

## Static build says `package.json not found`

The root `package.json` must be beside `README.md`.

## PythonAnywhere shows `ModuleNotFoundError`

- Confirm the virtualenv path on the Web tab.
- Activate the environment and reinstall `requirements-pythonanywhere.txt`.
- Confirm the WSGI `PROJECT_HOME` uses your exact username and ends in `/backend`.

## `/api/health` returns an error

Open the PythonAnywhere error log. The WSGI file or dependency setup is incorrect.

## Website loads but Analyze fails

1. Test the PythonAnywhere `/api/health` URL directly.
2. Confirm `API_BASE_URL` in Hugging Face Settings has no trailing slash and no `/api` suffix.
3. Confirm `FRONTEND_ORIGIN` in the WSGI file exactly matches the `.hf.space` origin.
4. Reload the PythonAnywhere web app.
5. Rebuild/restart the Static Space or hard-refresh with `Ctrl + F5`.

## Browser reports a CORS error

Temporarily set this in the WSGI file:

```python
os.environ["FRONTEND_ORIGIN"] = "*"
```

Reload PythonAnywhere and test. Once working, replace `*` with the exact `.hf.space` origin.

## PythonAnywhere disk quota error

Delete pip cache:

```bash
rm -rf ~/.cache/pip
```

Make sure the environment was created using `--system-site-packages`. Do not clone `.venv`, `node_modules`, or `dist` from another computer.
