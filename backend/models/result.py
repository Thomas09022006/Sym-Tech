from . import db
from datetime import datetime


class QuizResult(db.Model):
    __tablename__ = 'quiz_results'

    id              = db.Column(db.Integer, primary_key=True)
    name            = db.Column(db.String(100), nullable=False)
    reg_id          = db.Column(db.String(30), nullable=False)
    dept            = db.Column(db.String(20), default='')
    score           = db.Column(db.Integer, nullable=False)
    correct_count   = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    time_taken      = db.Column(db.Integer, nullable=False)
    screenshot_attempts = db.Column(db.Integer, default=0)
    flagged_cheater = db.Column(db.Boolean, default=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'regId': self.reg_id,
            'dept': self.dept,
            'score': self.score,
            'correct': self.correct_count,
            'total': self.total_questions,
            'time': self.time_taken,
            'screenshotAttempts': self.screenshot_attempts,
            'flaggedCheater': self.flagged_cheater,
            'date': self.created_at.strftime('%m/%d/%Y, %I:%M:%S %p') if self.created_at else ''
        }


class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'

    id           = db.Column(db.Integer, primary_key=True)
    reg_id       = db.Column(db.String(30), unique=True, nullable=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow)
