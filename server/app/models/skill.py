from datetime import datetime
from ..extensions import db

class Skill(db.Model):
    __tablename__ = "skills"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    type = db.Column(db.String(10), nullable=False)  # offer | seek
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(255), nullable=True)  # comma-separated
    visibility = db.Column(db.String(10), nullable=False, default="public")  # public | private
    requests = db.relationship("SessionRequest", backref="skill", lazy=True, cascade="all, delete-orphan")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
