from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.base_model import BaseModel


class Role:
    ADMIN = "Administrador"
    STUDENT = "Estudiante"


class User(BaseModel):
    __tablename__ = "estudiantes"

    nombres = db.Column(db.String(120), nullable=False)
    correo = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), default=Role.STUDENT, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)

    reviews = db.relationship(
        "Review",
        back_populates="student",
        foreign_keys="Review.estudiante_id",
        cascade="all, delete-orphan",
        lazy=True,
    )

    @property
    def password(self) -> None:
        raise AttributeError("La contrasena no es legible.")

    @password.setter
    def password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def verify_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombres": self.nombres,
            "correo": self.correo,
            "role": self.role,
            "active": self.active,
        }
