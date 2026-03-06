"""Leaderboard / results endpoints."""

from flask import Blueprint, jsonify
from backend.models import db
from backend.models.result import QuizResult, QuizAttempt

results_bp = Blueprint('results', __name__)


# ── GET  /api/v1/results ────────────────────────
@results_bp.route('', methods=['GET'])
def get_results():
    try:
        # Debug: return empty list first
        return jsonify({
            'success': True,
            'results': [],
            'debug': 'Route is functional'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


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


# ── GET  /api/v1/results/export ─────────────
@results_bp.route('/export', methods=['GET'])
def export_results():
    results = QuizResult.query.order_by(QuizResult.score.desc()).all()
    output = "ID,Name,RegID,Dept,Score,Correct,Total,Time,Cheater,Date\n"
    for r in results:
        d = r.to_dict()
        output += f"{d['id']},{d['name']},{d['regId']},{d['dept']},{d['score']},{d['correct']},{d['total']},{d['time']},{d['flaggedCheater']},{d['date']}\n"
    
    return output, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=results.csv'
    }

