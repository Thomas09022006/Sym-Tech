from flask import Blueprint, jsonify
from backend.models import db
from sqlalchemy import text

debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/db-check', methods=['GET'])
def db_check():
    try:
        # Check columns in registrations table
        with db.engine.connect() as connection:
            result = connection.execute(text("SHOW COLUMNS FROM registrations")).fetchall()
        columns = [row[0] for row in result]
        return jsonify({
            'success': True,
            'columns': columns
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })
