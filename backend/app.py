"""Flask API for ScamShield AI."""
from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from model import get_detector

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("SCAMSHIELD_DB", BASE_DIR / "scamshield.db"))
MAX_MESSAGE_LENGTH = 5000

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False
CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_ORIGIN", "*")}})


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(get_db()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                verdict TEXT NOT NULL,
                confidence REAL NOT NULL,
                scam_probability REAL NOT NULL,
                risk_level TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def serialize_scan(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "message": row["message"],
        "verdict": row["verdict"],
        "confidence": row["confidence"],
        "scam_probability": row["scam_probability"],
        "risk_level": row["risk_level"],
        "created_at": row["created_at"],
    }


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "ScamShield AI", "model": "TF-IDF + Logistic Regression"})


@app.post("/api/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()

    if not message:
        return jsonify({"error": "Please enter a message to analyze."}), 400
    if len(message) < 4:
        return jsonify({"error": "The message is too short to analyze reliably."}), 400
    if len(message) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Message must be under {MAX_MESSAGE_LENGTH} characters."}), 400

    result = get_detector().analyze(message)
    created_at = datetime.now(timezone.utc).isoformat()

    with closing(get_db()) as conn:
        cursor = conn.execute(
            """
            INSERT INTO scans (message, verdict, confidence, scam_probability, risk_level, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                message,
                result["verdict"],
                result["confidence"],
                result["scam_probability"],
                result["risk_level"],
                created_at,
            ),
        )
        conn.commit()
        result["id"] = cursor.lastrowid
        result["message"] = message
        result["created_at"] = created_at

    return jsonify(result), 201


@app.get("/api/history")
def history():
    try:
        limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    except ValueError:
        limit = 20

    with closing(get_db()) as conn:
        rows = conn.execute(
            "SELECT * FROM scans ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        totals = conn.execute(
            """
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN verdict = 'SCAM' THEN 1 ELSE 0 END) AS scams
            FROM scans
            """
        ).fetchone()

    return jsonify({
        "items": [serialize_scan(row) for row in rows],
        "summary": {"total": totals["total"] or 0, "scams": totals["scams"] or 0},
    })


@app.delete("/api/history")
def clear_history():
    with closing(get_db()) as conn:
        conn.execute("DELETE FROM scans")
        conn.commit()
    return jsonify({"message": "History cleared."})


@app.delete("/api/history/<int:scan_id>")
def delete_scan(scan_id: int):
    with closing(get_db()) as conn:
        cursor = conn.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
        conn.commit()
    if cursor.rowcount == 0:
        return jsonify({"error": "Scan not found."}), 404
    return jsonify({"message": "Scan deleted."})


@app.errorhandler(404)
def not_found(_error):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(500)
def server_error(_error):
    return jsonify({"error": "Something went wrong on the server."}), 500


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG") == "1")
