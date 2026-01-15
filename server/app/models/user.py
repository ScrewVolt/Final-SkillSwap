from datetime import datetime
from ..extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    role = db.Column(db.String(20), nullable=False, default="student")
    bio = db.Column(db.Text, nullable=True)

    skills = db.relationship("Skill", backref="user", lazy=True, cascade="all, delete-orphan")

    # Requests I created
    requests_made = db.relationship(
        "SessionRequest",
        foreign_keys="SessionRequest.requester_id",
        backref="requester",
        lazy=True,
        cascade="all, delete-orphan"
    )

    # Requests made to me (as provider)
    requests_received = db.relationship(
        "SessionRequest",
        foreign_keys="SessionRequest.provider_id",
        backref="provider",
        lazy=True,
        cascade="all, delete-orphan"
    )

    notifications = db.relationship(
        "Notification",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )   

    availability = db.relationship(
        "Availability",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
