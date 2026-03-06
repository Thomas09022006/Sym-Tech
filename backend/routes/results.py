"""Leaderboard / results endpoints."""

from flask import Blueprint, jsonify
from backend.models import db
from backend.models.result import QuizResult, QuizAttempt

results_bp = Blueprint('results', __name__)


# ── GET  /api/v1/results ────────────────────────
@results_bp.route('', methods=['GET'])
def get_results():
    results = QuizResult.query.order_by(
        QuizResult.score.desc(), QuizResult.time_taken.asc()
    ).all()
    return jsonify({
        'success': True,
        'results': [r.to_dict() for r in results]
    })


# ── DELETE  /api/v1/results ─────────────────────
@results_bp.route('', methods=['DELETE'])
def clear_results():
    QuizResult.query.delete()
    db.session.commit()
    return jsonify({'success': True, 'message': 'All results cleared.'})


# ── DELETE  /api/v1/attempts ────────────────────
@results_bp.route('/attempts', methods=['DELETE'])
def clear_attempts():
    QuizAttempt.query.delete()
    db.session.commit()
    return jsonify({'success': True, 'message': 'All attempts cleared. Members can retake the quiz.'})
