from datetime import datetime

from app.extensions import db


class BaseModel(db.Model):
    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        server_default=db.text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=db.text("CURRENT_TIMESTAMP"),
        server_onupdate=db.text("CURRENT_TIMESTAMP"),
        nullable=False,
    )

    def update(self, data: dict) -> "BaseModel":
        for key, value in data.items():
            if hasattr(self, key) and key not in {"id", "created_at"}:
                setattr(self, key, value)
        return self
