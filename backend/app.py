"""
InnovateX Quiz Platform — Flask Application Entry Point.

Run:
    python -m backend.app
    # or
    python backend/app.py
"""

import os
import sys

# Ensure project root is on sys.path so 'backend' package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from flask import Flask, send_from_directory
from flask_cors import CORS

from backend.config import Config
from backend.models import db

# Import models so SQLAlchemy knows about them
from backend.models.registration import Registration   # noqa: F401
from backend.models.question import Question             # noqa: F401
from backend.models.result import QuizResult, QuizAttempt  # noqa: F401
from backend.models.setting import QuizSetting           # noqa: F401

# Import route blueprints
from backend.routes.registrations import registrations_bp
from backend.routes.questions import questions_bp
from backend.routes.quiz import quiz_bp
from backend.routes.results import results_bp
from backend.routes.settings import settings_bp
from backend.routes.admin import admin_bp


def create_app():
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(__file__), '..', 'frontend'),
        static_url_path=''
    )
    app.config.from_object(Config)

    # ── Extensions ──────────────────────────────
    frontend_url = os.getenv('FRONTEND_URL', '*')
    CORS(app, origins=[frontend_url] if frontend_url != '*' else '*')
    db.init_app(app)

    # ── Register Blueprints ─────────────────────
    app.register_blueprint(registrations_bp, url_prefix='/api/v1/registrations')
    app.register_blueprint(questions_bp,     url_prefix='/api/v1/questions')
    app.register_blueprint(quiz_bp,          url_prefix='/api/v1/quiz')
    app.register_blueprint(results_bp,       url_prefix='/api/v1/results')
    app.register_blueprint(settings_bp,      url_prefix='/api/v1/settings')
    app.register_blueprint(admin_bp,         url_prefix='/api/v1/admin')

    # ── Serve frontend (local dev only) ─────────
    if not os.getenv('RENDER'):
        @app.route('/')
        def serve_index():
            return send_from_directory(app.static_folder, 'index.html')

        @app.route('/<path:path>')
        def serve_static(path):
            return send_from_directory(app.static_folder, path)
    else:
        # Simple health check for Render root URL
        @app.route('/')
        def api_root():
            return {"status": "online", "message": "InnovateX Quiz API is running", "version": "1.0"}

    # ── Create tables if they don't exist ───────
    with app.app_context():
        db.create_all()

    return app


# ── Main ────────────────────────────────────────
if __name__ == '__main__':
    app = create_app()
    print("\n  🚀  InnovateX Quiz Platform")
    print("  ─────────────────────────────")
    print("  Frontend:  http://localhost:5000")
    print("  API Base:  http://localhost:5000/api/v1/")
    print("  ─────────────────────────────\n")
    app.run(host='0.0.0.0', port=5000, debug=Config.DEBUG)
