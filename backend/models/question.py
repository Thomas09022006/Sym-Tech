from . import db
from datetime import datetime


class Question(db.Model):
    __tablename__ = 'questions'

    id             = db.Column(db.Integer, primary_key=True)
    question       = db.Column(db.Text, nullable=False)
    option_a       = db.Column(db.String(255), nullable=False)
    option_b       = db.Column(db.String(255), nullable=False)
    option_c       = db.Column(db.String(255), nullable=False)
    option_d       = db.Column(db.String(255), nullable=False)
    correct_answer = db.Column(db.SmallInteger, nullable=False)  # 0-3
    topic          = db.Column(db.String(60), nullable=False)
    difficulty     = db.Column(db.String(4), nullable=False, default='easy')
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, include_answer=True):
        d = {
            'id': self.id,
            'q': self.question,
            'opts': [self.option_a, self.option_b, self.option_c, self.option_d],
            'topic': self.topic,
            'diff': self.difficulty,
        }
        if include_answer:
            d['ans'] = self.correct_answer
        return d
