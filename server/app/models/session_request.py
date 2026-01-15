from datetime import datetime
from ..extensions import db

class SessionRequest(db.Model):
    __tablename__ = "session_requests"

    id = db.Column(db.Integer, primary_key=True)

    # Who requested the session
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Who owns the skill being requested
    provider_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # Which skill is the request for
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id"), nullable=False, index=True)

    message = db.Column(db.Text, nullable=True)

    # pending | accepted | declined | cancelled | completed
    status = db.Column(db.String(20), nullable=False, default="pending")

    scheduled_start = db.Column(db.DateTime, nullable=True)
    scheduled_end = db.Column(db.DateTime, nullable=True)
    timezone = db.Column(db.String(64), nullable=True)  # e.g. "America/Denver"

    # none | proposed | confirmed
    schedule_status = db.Column(db.String(20), nullable=False, default="none")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime, nullable=True)
