"""Registration CRUD endpoints."""

import random
import string
from flask import Blueprint, request, jsonify
from backend.models import db
from backend.models.registration import Registration

registrations_bp = Blueprint('registrations', __name__)


def _generate_reg_id():
    """Generate a registration ID like INX-XXXXXXX."""
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
    return 'INX-' + suffix


# ── POST  /api/v1/registrations ─────────────────
@registrations_bp.route('', methods=['POST'])
def create_registration():
    data = request.get_json(silent=True) or {}

    name = (data.get('name') or '').strip()
    roll = (data.get('roll') or '').strip()
    year = (data.get('year') or '').strip()
    dept = (data.get('dept') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()
    college = (data.get('college') or '').strip() or 'CSI College of Engineering'

    errors = []

    if not name:
        errors.append('Name is required.')
    if not year:
        errors.append('Year is required.')
    if not dept:
        errors.append('Department is required.')

    if errors:
        return jsonify({'success': False, 'errors': errors}), 400

    reg_id = _generate_reg_id()

    reg = Registration(
        reg_id=reg_id,
        name=name,
        roll=roll,
        year=year,
        dept=dept,
        phone=phone or None,
        email=email or None,
        college=college
    )

    db.session.add(reg)
    db.session.commit()

    return jsonify({
        'success': True,
        'registration': reg.to_dict()
    }), 201


# ── GET  /api/v1/registrations ──────────────────
@registrations_bp.route('', methods=['GET'])
def list_registrations():
    regs = Registration.query.order_by(Registration.created_at.desc()).all()

    return jsonify({
        'success': True,
        'registrations': [r.to_dict() for r in regs],
        'count': len(regs)
    })


# ── DELETE  /api/v1/registrations ───────────────
@registrations_bp.route('', methods=['DELETE'])
def clear_registrations():
    Registration.query.delete()
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'All registrations cleared.'
    })


# ── GET  /api/v1/registrations/export ──────────
@registrations_bp.route('/export', methods=['GET'])
def export_registrations():
    regs = Registration.query.all()

    output = "ID,RegID,Name,Year,Dept,College,QuizDone,Date\n"

    for r in regs:
        d = r.to_dict()
        output += f"{d['id']},{d['regId']},{d['name']},{d['year']},{d['dept']},{d['college']},{d['quizDone']},{d['date']}\n"

    return output, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=registrations.csv'
    }
