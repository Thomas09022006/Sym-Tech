"""Quiz flow endpoints — start and submit."""

import random
from flask import Blueprint, request, jsonify
from backend.models import db
from backend.models.question import Question
from backend.models.result import QuizResult, QuizAttempt
from backend.models.setting import QuizSetting
from backend.models.registration import Registration

quiz_bp = Blueprint('quiz', __name__)


# ── POST  /api/v1/quiz/start ────────────────────
@quiz_bp.route('/start', methods=['POST'])
def start_quiz():
    """
    Validate roll number hasn't attempted, then return a set of questions
    (without correct answers) based on current settings.
    """
    data = request.get_json(silent=True) or {}
    reg_id = (data.get('regId') or '').strip().upper()

    if not name or not reg_id:
        return jsonify({'success': False, 'error': 'Name and Register ID are required.'}), 400

    # Verify registration exists
    reg = Registration.query.filter_by(reg_id=reg_id).first()
    if not reg:
        return jsonify({'success': False, 'error': 'Invalid Register ID.'}), 404
    
    if reg.name.lower() != name.lower():
        return jsonify({'success': False, 'error': 'Name does not match the registered user for this ID.'}), 403

    # Check one-time attempt
    existing = QuizAttempt.query.filter_by(reg_id=reg_id).first()
    if existing:
        return jsonify({'success': False, 'error': 'This Register ID has already attempted the quiz.'}), 403

    # Get settings
    setting = QuizSetting.query.first()
    if not setting:
        setting = QuizSetting()
        db.session.add(setting)
        db.session.commit()

    # Get questions separated by difficulty and grouped by domain
    easy_questions = Question.query.filter_by(difficulty='easy').all()
    hard_questions = Question.query.filter_by(difficulty='hard').all()

    if not easy_questions and not hard_questions:
        return jsonify({'success': False, 'error': 'No questions available. Please contact the admin.'}), 404

    # Group by domain (topic)
    from collections import defaultdict
    easy_by_domain = defaultdict(list)
    hard_by_domain = defaultdict(list)
    for q in easy_questions:
        easy_by_domain[q.topic].append(q)
    for q in hard_questions:
        hard_by_domain[q.topic].append(q)

    all_domains = sorted(set(list(easy_by_domain.keys()) + list(hard_by_domain.keys())))

    # Shuffle within each domain pool
    if setting.shuffle_questions:
        for domain in all_domains:
            random.shuffle(easy_by_domain[domain])
            random.shuffle(hard_by_domain[domain])

    # Pick 4 per domain, target: 15 easy + 25 hard = 40 total
    QUESTIONS_PER_DOMAIN = 4
    TARGET_EASY = 15
    TARGET_HARD = 25
    q_list = []
    easy_count = 0
    hard_count = 0

    # First pass: pick per domain aiming for ~1-2 easy, ~2-3 hard
    domain_picks = []
    for domain in all_domains:
        pool_easy = easy_by_domain[domain]
        pool_hard = hard_by_domain[domain]

        # Default: 1 easy + 3 hard per domain (10 domains × 1 easy = 10, × 3 hard = 30)
        # But we want 15 easy + 25 hard, so 5 domains get 2 easy + 2 hard
        n_easy = min(1, len(pool_easy))
        n_hard = min(QUESTIONS_PER_DOMAIN - n_easy, len(pool_hard))
        n_easy = QUESTIONS_PER_DOMAIN - n_hard  # fill remaining with easy

        picked_easy = pool_easy[:n_easy]
        picked_hard = pool_hard[:n_hard]
        domain_picks.append({'domain': domain, 'easy': picked_easy, 'hard': picked_hard})
        easy_count += len(picked_easy)
        hard_count += len(picked_hard)

    # Second pass: adjust to hit exactly 15 easy + 25 hard
    # If we have too few easy, swap some hard→easy in domains that have spare easy
    while easy_count < TARGET_EASY:
        swapped = False
        for dp in domain_picks:
            if easy_count >= TARGET_EASY:
                break
            domain = dp['domain']
            used_easy_ids = {q.id for q in dp['easy']}
            spare_easy = [q for q in easy_by_domain[domain] if q.id not in used_easy_ids]
            if spare_easy and len(dp['hard']) > 1:
                dp['easy'].append(spare_easy[0])
                dp['hard'].pop()
                easy_count += 1
                hard_count -= 1
                swapped = True
        if not swapped:
            break

    # Combine all picks
    for dp in domain_picks:
        q_list.extend(dp['easy'])
        q_list.extend(dp['hard'])

    # Final shuffle of the full list
    if setting.shuffle_questions:
        random.shuffle(q_list)

    # Build response (exclude correct answers — scoring is server-side)
    questions_out = []
    for q in q_list:
        d = q.to_dict(include_answer=False)
        d['id'] = q.id  # Need ID for answer submission
        if setting.shuffle_options:
            indices = list(range(4))
            random.shuffle(indices)
            d['opts'] = [q.to_dict()['opts'][i] for i in indices]
            d['_map'] = indices  # frontend doesn't need this; server will re-check
        questions_out.append(d)

    return jsonify({
        'success': True,
        'questions': questions_out,
        'settings': setting.to_dict(),
        'participant': {'name': name, 'regId': reg_id, 'dept': reg.dept}
    })


# ── POST  /api/v1/quiz/submit ───────────────────
@quiz_bp.route('/submit', methods=['POST'])
def submit_quiz():
    """
    Submit answers, compute score server-side, record result and attempt.
    Expected payload:
    {
        "name": "...", "roll": "...", "dept": "...",
        "answers": [ {"questionId": 1, "selected": 2}, ... ],
        "timeTaken": 120
    }
    """
    data = request.get_json(silent=True) or {}
    reg_id = (data.get('regId') or '').strip().upper()
    answers = data.get('answers', [])
    time_taken = data.get('timeTaken', 0)
    screenshot_attempts = data.get('screenshotAttempts', 0)
    flagged_cheater = data.get('flaggedCheater', False)

    if not name or not reg_id:
        return jsonify({'success': False, 'error': 'Name and Register ID are required.'}), 400

    # Prevent double-submit
    existing = QuizAttempt.query.filter_by(reg_id=reg_id).first()
    if existing:
        return jsonify({'success': False, 'error': 'Quiz already submitted for this ID.'}), 403

    # Score answers
    correct_count = 0
    total = len(answers)

    for ans in answers:
        qid = ans.get('questionId')
        selected = ans.get('selected', -1)
        q = Question.query.get(qid)
        if q and selected == q.correct_answer:
            correct_count += 1

    score = round((correct_count / total) * 100) if total > 0 else 0

    # Save result
    result = QuizResult(
        name=name, reg_id=reg_id, dept=dept,
        score=score, correct_count=correct_count,
        total_questions=total, time_taken=time_taken,
        screenshot_attempts=screenshot_attempts,
        flagged_cheater=flagged_cheater
    )
    db.session.add(result)

    # Mark as attempted
    attempt = QuizAttempt(reg_id=reg_id)
    db.session.add(attempt)

    # Update registration quiz_done flag
    reg = Registration.query.filter_by(reg_id=reg_id).first()
    if reg:
        reg.quiz_done = True

    db.session.commit()

    return jsonify({
        'success': True,
        'result': result.to_dict()
    }), 201
