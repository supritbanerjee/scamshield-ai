"""Upload this project to an existing Hugging Face Static Space."""

from pathlib import Path

from huggingface_hub import HfApi


REPO_ID = "Suprit1453/scamshield-ai"
PROJECT_ROOT = Path(__file__).resolve().parent

IGNORE_PATTERNS = [
    ".git/**",
    ".github/**",
    ".venv/**",
    ".venv/*",
    "venv/**",
    "frontend/node_modules/**",
    "frontend/dist/**",
    "node_modules/**",
    "dist/**",
    ".pytest_cache/**",
    "**/__pycache__/**",
    "**/*.pyc",
    "**/*.pyo",
    "backend/scamshield.db",
    "tests/test_scans.db",
    ".env",
    ".env.*",
    "*.zip",
]


def main():
    api = HfApi()

    print(f"Checking Space: {REPO_ID}")

    info = api.repo_info(
        repo_id=REPO_ID,
        repo_type="space",
    )

    print(f"Space found: {info.id}")
    print(f"Uploading project from: {PROJECT_ROOT}")

    result = api.upload_folder(
        repo_id=REPO_ID,
        repo_type="space",
        folder_path=str(PROJECT_ROOT),
        path_in_repo=".",
        ignore_patterns=IGNORE_PATTERNS,
        commit_message="Deploy ScamShield AI static frontend",
    )

    print("\nUpload completed successfully.")
    print(result)


if __name__ == "__main__":
    main()