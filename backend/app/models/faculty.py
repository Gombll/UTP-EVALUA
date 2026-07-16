from app.extensions import db
from app.models.base_model import BaseModel


class Faculty(BaseModel):
    __tablename__ = "facultades"

    nombre = db.Column(db.String(120), unique=True, nullable=False, index=True)

    careers = db.relationship(
        "Career",
        back_populates="faculty",
        cascade="all, delete-orphan",
        lazy=True,
    )
    teachers = db.relationship("Teacher", back_populates="faculty", lazy=True)

    def to_dict(self) -> dict:
        return {"id": self.id, "nombre": self.nombre}
