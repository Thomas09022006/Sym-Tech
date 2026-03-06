"""Admin authentication endpoint."""

from flask import Blueprint, request, jsonify, current_app

admin_bp = Blueprint('admin', __name__)


# ── POST  /api/v1/admin/login ───────────────────
@admin_bp.route('/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    password = data.get('password', '')

    if password == current_app.config['ADMIN_PASSWORD']:
        return jsonify({'success': True, 'message': 'Admin access granted.'})
    else:
        return jsonify({'success': False, 'error': 'Incorrect password.'}), 401
