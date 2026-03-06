from . import db
from datetime import datetime


class Registration(db.Model):
    __tablename__ = 'registrations'

    id         = db.Column(db.Integer, primary_key=True)
    reg_id     = db.Column(db.String(20), unique=True, nullable=False)
    name       = db.Column(db.String(100), nullable=False)
    roll       = db.Column(db.String(30), nullable=False)
    year       = db.Column(db.String(20), nullable=False)
    dept       = db.Column(db.String(20), nullable=False)
    phone      = db.Column(db.String(15))
    email      = db.Column(db.String(100))
    college    = db.Column(db.String(150), default='CSI College of Engineering')
    quiz_done  = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'regId': self.reg_id,
            'name': self.name,
            'roll': self.roll,
            'year': self.year,
            'dept': self.dept,
            'phone': self.phone or '',
            'email': self.email or '',
            'college': self.college,
            'quizDone': self.quiz_done,
            'date': self.created_at.strftime('%m/%d/%Y, %I:%M:%S %p') if self.created_at else ''
        }
