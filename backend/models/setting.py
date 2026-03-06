from . import db


class QuizSetting(db.Model):
    __tablename__ = 'quiz_settings'

    id                 = db.Column(db.Integer, primary_key=True)
    timer_seconds      = db.Column(db.Integer, nullable=False, default=30)
    questions_per_quiz = db.Column(db.Integer, nullable=False, default=40)
    shuffle_questions  = db.Column(db.Boolean, nullable=False, default=True)
    shuffle_options    = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            'timer': self.timer_seconds,
            'questionsPerQuiz': self.questions_per_quiz,
            'shuffle': self.shuffle_questions,
            'shuffleOpts': self.shuffle_options,
        }