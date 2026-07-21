from app.extensions import db
from app.models.base_model import BaseModel


class Course(BaseModel):
    __tablename__ = "cursos"

    nombre = db.Column(db.String(140), nullable=False, index=True)
    codigo = db.Column(db.String(40), nullable=True)
    carrera_id = db.Column(
        db.Integer,
        db.ForeignKey("carreras.id", ondelete="CASCADE"),
        nullable=False,
    )

    career = db.relationship("Career", back_populates="courses")
    teachers = db.relationship("Teacher", back_populates="course", lazy=True)

    __table_args__ = (
        db.UniqueConstraint("nombre", "carrera_id", name="uq_curso_carrera"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombre": self.nombre,
            "codigo": self.codigo,
            "carrera_id": self.carrera_id,
            "carrera": self.career.nombre if self.career else None,
            "docentes": len(self.teachers),
        }
