from datetime import datetime
from ..extensions import db

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # e.g. "session_request", "session_accepted", ...
    type = db.Column(db.String(50), nullable=False)

    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.Text, nullable=True)

    # Optional links (handy for UI)
    session_request_id = db.Column(db.Integer, nullable=True)
    skill_id = db.Column(db.Integer, nullable=True)

    is_read = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
