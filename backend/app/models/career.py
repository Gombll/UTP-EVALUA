from app.extensions import db
from app.models.base_model import BaseModel


class Career(BaseModel):
    __tablename__ = "carreras"

    nombre = db.Column(db.String(140), nullable=False, index=True)
    facultad_id = db.Column(
        db.Integer,
        db.ForeignKey("facultades.id", ondelete="CASCADE"),
        nullable=False,
    )

    faculty = db.relationship("Faculty", back_populates="careers")
    teachers = db.relationship("Teacher", back_populates="career", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("nombre", "facultad_id", name="uq_carrera_facultad"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "facultad_id": self.facultad_id,
            "facultad": self.faculty.nombre if self.faculty else None,
        }
