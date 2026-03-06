"""Question CRUD endpoints."""

from flask import Blueprint, request, jsonify
from backend.models import db
from backend.models.question import Question

questions_bp = Blueprint('questions', __name__)


# ── GET  /api/v1/questions ──────────────────────
@questions_bp.route('', methods=['GET'])
def list_questions():
    qs = Question.query.order_by(Question.id).all()
    return jsonify({'success': True, 'questions': [q.to_dict() for q in qs]})


# ── POST  /api/v1/questions ─────────────────────
@questions_bp.route('', methods=['POST'])
def add_question():
    data = request.get_json(silent=True) or {}

    question_text = (data.get('q') or '').strip()
    opts = data.get('opts', [])
    ans = data.get('ans')
    topic = (data.get('topic') or '').strip()
    diff = (data.get('diff') or 'easy').strip().lower()

    # Validation
    errors = []
    if not question_text:
        errors.append('Question text is required.')
    if not isinstance(opts, list) or len(opts) != 4 or any(not str(o).strip() for o in opts):
        errors.append('Exactly 4 non-empty options are required.')
    if ans not in (0, 1, 2, 3):
        errors.append('Correct answer must be 0, 1, 2, or 3.')
    if not topic:
        errors.append('Topic is required.')
    if diff not in ('easy', 'hard'):
        errors.append('Difficulty must be "easy" or "hard".')
    if errors:
        return jsonify({'success': False, 'errors': errors}), 400

    q = Question(
        question=question_text,
        option_a=str(opts[0]).strip(),
        option_b=str(opts[1]).strip(),
        option_c=str(opts[2]).strip(),
        option_d=str(opts[3]).strip(),
        correct_answer=ans,
        topic=topic,
        difficulty=diff
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({'success': True, 'question': q.to_dict()}), 201


# ── PUT  /api/v1/questions/<id> ─────────────────
@questions_bp.route('/<int:qid>', methods=['PUT'])
def update_question(qid):
    q = Question.query.get(qid)
    if not q:
        return jsonify({'success': False, 'error': 'Question not found.'}), 404

    data = request.get_json(silent=True) or {}

    if 'q' in data:
        q.question = str(data['q']).strip()
    if 'opts' in data:
        opts = data['opts']
        if isinstance(opts, list) and len(opts) == 4:
            q.option_a = str(opts[0]).strip()
            q.option_b = str(opts[1]).strip()
            q.option_c = str(opts[2]).strip()
            q.option_d = str(opts[3]).strip()
    if 'ans' in data and data['ans'] in (0, 1, 2, 3):
        q.correct_answer = data['ans']
    if 'topic' in data:
        q.topic = str(data['topic']).strip()
    if 'diff' in data and data['diff'] in ('easy', 'hard'):
        q.difficulty = data['diff']

    db.session.commit()
    return jsonify({'success': True, 'question': q.to_dict()})


# ── DELETE  /api/v1/questions/<id> ──────────────
@questions_bp.route('/<int:qid>', methods=['DELETE'])
def delete_question(qid):
    q = Question.query.get(qid)
    if not q:
        return jsonify({'success': False, 'error': 'Question not found.'}), 404
    db.session.delete(q)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Question deleted.'})
