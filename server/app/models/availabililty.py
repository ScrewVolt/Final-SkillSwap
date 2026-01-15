from datetime import datetime
from ..extensions import db

class Availability(db.Model):
    __tablename__ = "availability"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)

    timezone = db.Column(db.String(64), nullable=False, default="America/Denver")
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    # ✅ reservation support
    reserved_request_id = db.Column(
        db.Integer,
        db.ForeignKey("session_requests.id", name="fk_availability_reserved_request_id"),
        nullable=True,
        index=True,
    )
    reserved_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
