"""Quiz settings endpoints."""

from flask import Blueprint, request, jsonify
from backend.models import db
from backend.models.setting import QuizSetting

settings_bp = Blueprint('settings', __name__)


# ── GET  /api/v1/settings ───────────────────────
@settings_bp.route('', methods=['GET'])
def get_settings():
    s = QuizSetting.query.first()
    if not s:
        s = QuizSetting()
        db.session.add(s)
        db.session.commit()
    return jsonify({'success': True, 'settings': s.to_dict()})


# ── PUT  /api/v1/settings ───────────────────────
@settings_bp.route('', methods=['PUT'])
def update_settings():
    s = QuizSetting.query.first()
    if not s:
        s = QuizSetting()
        db.session.add(s)

    data = request.get_json(silent=True) or {}

    if 'timer' in data:
        val = int(data['timer'])
        s.timer_seconds = max(5, min(120, val))
    if 'questionsPerQuiz' in data:
        val = int(data['questionsPerQuiz'])
        s.questions_per_quiz = max(1, min(200, val))
    if 'shuffle' in data:
        s.shuffle_questions = bool(data['shuffle'])
    if 'shuffleOpts' in data:
        s.shuffle_options = bool(data['shuffleOpts'])

    db.session.commit()
    return jsonify({'success': True, 'settings': s.to_dict()})
