from datetime import datetime
from ..extensions import db

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)

    session_request_id = db.Column(
        db.Integer,
        db.ForeignKey("session_requests.id"),
        nullable=False,
        index=True,
    )

    # who wrote the review
    from_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    # who received the review
    to_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    rating = db.Column(db.Integer, nullable=False)  # 1..5
    comment = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("session_request_id", "from_user_id", name="uq_review_one_per_user_per_session"),
    )
