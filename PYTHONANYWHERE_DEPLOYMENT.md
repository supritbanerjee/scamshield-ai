# Deploy the Complete ScamShield App on PythonAnywhere — Free, No Card

Hugging Face Static builds and Docker are credit-gated for some accounts. This setup uses one free PythonAnywhere Beginner web app for everything:

```text
https://YOUR_USERNAME.pythonanywhere.com/
├── React website (compiled frontend/dist)
├── Flask REST API (/api/...)
├── scikit-learn NLP model
└── SQLite history
```

## 1. Build the React frontend locally

In PowerShell from the project root:

```powershell
cd frontend
npm install
npm run build
cd ..
```

Confirm:

```powershell
Test-Path .\frontend\dist\index.html
```

Expected: `True`.

## 2. Commit the production build

The `.gitignore` in this version explicitly allows `frontend/dist` because PythonAnywhere will serve those compiled files.

```powershell
git add .
git add -f frontend/dist
git status
```

Confirm `frontend/dist/index.html`, assets, and the three images are staged. Do not stage `.venv` or `frontend/node_modules`.

```powershell
git commit -m "Add production frontend build for PythonAnywhere"
git push
```

## 3. Create a free account

Register for a Beginner account at:

<https://www.pythonanywhere.com/registration/register/beginner/>

Do not choose a paid plan. Your public domain will be:

```text
https://YOUR_PA_USERNAME.pythonanywhere.com
```

## 4. Clone the GitHub repository

Open **Consoles → Bash** on PythonAnywhere:

```bash
cd ~
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

If it was already cloned:

```bash
cd ~/YOUR_REPOSITORY
git pull
```

Confirm the frontend build arrived:

```bash
ls frontend/dist/index.html
```

## 5. Create a virtual environment

Use the same Python version selected for the web app. Python 3.10 is a compatible example:

```bash
python3.10 -m venv --system-site-packages .venv
source .venv/bin/activate
pip install --no-cache-dir -r requirements-pythonanywhere.txt
```

Test:

```bash
python -c "import flask, flask_cors, sklearn; print('Dependencies OK', sklearn.__version__)"
python -c "import sys; sys.path.insert(0, 'backend'); from app import app; print('Flask app OK')"
```

## 6. Create the web app

1. Open the PythonAnywhere **Web** tab.
2. Click **Add a new web app**.
3. Accept the free domain.
4. Choose **Manual configuration**.
5. Choose the same Python version used for `.venv`.

Set the **Virtualenv** field to:

```text
/home/YOUR_PA_USERNAME/YOUR_REPOSITORY/.venv
```

## 7. Configure WSGI

Open the WSGI configuration file from the Web tab. Replace the sample content with:

```python
import os
import sys

PROJECT_ROOT = "/home/YOUR_PA_USERNAME/YOUR_REPOSITORY"
BACKEND_DIR = f"{PROJECT_ROOT}/backend"

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ["FRONTEND_ORIGIN"] = "https://YOUR_PA_USERNAME.pythonanywhere.com"
os.environ["SCAMSHIELD_DB"] = f"{BACKEND_DIR}/scamshield.db"

from app import app as application
```

Replace every placeholder with the real PythonAnywhere username and repository folder. Save the file.

## 8. Reload and test

Click the green **Reload** button on the Web tab.

Open:

```text
https://YOUR_PA_USERNAME.pythonanywhere.com/api/health
```

Expected JSON contains `"status": "ok"`.

Then open:

```text
https://YOUR_PA_USERNAME.pythonanywhere.com/
```

The complete styled React website should load. Test scam analysis, legitimate analysis, history, delete-one, and Clear All.

## 9. Troubleshooting

### Root shows `Frontend build not found`

The compiled files are missing from PythonAnywhere:

```bash
cd ~/YOUR_REPOSITORY
git pull
ls frontend/dist/index.html
```

If the local GitHub repository does not contain `frontend/dist`, locally run the build and force-add it:

```powershell
cd frontend
npm run build
cd ..
git add -f frontend/dist
git commit -m "Commit frontend production build"
git push
```

Then pull again on PythonAnywhere and Reload.

### `ModuleNotFoundError`

Verify the Web tab's virtualenv path and reinstall:

```bash
cd ~/YOUR_REPOSITORY
source .venv/bin/activate
pip install --no-cache-dir -r requirements-pythonanywhere.txt
```

### `500 Internal Server Error`

Open the error log linked on the Web tab. Most issues are an incorrect username/repository path in the WSGI file.

### Disk quota error

```bash
rm -rf ~/.cache/pip
```

The environment should use `--system-site-packages`. Do not upload `.venv`, `node_modules`, or root `dist`.

## Updating later

Locally:

```powershell
cd frontend
npm run build
cd ..
git add .
git add -f frontend/dist
git commit -m "Update ScamShield app"
git push
```

On PythonAnywhere Bash:

```bash
cd ~/YOUR_REPOSITORY
git pull
```

Then click **Reload** on the Web tab.

## Free-account note

The app and SQLite database live on PythonAnywhere's filesystem. Free web apps can require periodic renewal/reload after inactivity. This is acceptable for a portfolio demo; check the Web dashboard before interviews.
