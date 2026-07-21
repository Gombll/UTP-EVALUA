from functools import reduce

from app.extensions import db
from app.models.base_model import BaseModel
from app.models.review import ReviewStatus


class Teacher(BaseModel):
    __tablename__ = "docentes"

    nombres = db.Column(db.String(120), nullable=False)
    apellidos = db.Column(db.String(120), nullable=False)
    correo = db.Column(db.String(160), unique=True, nullable=False, index=True)
    fotografia = db.Column(db.String(255), nullable=True)
    facultad_id = db.Column(db.Integer, db.ForeignKey("facultades.id"), nullable=False)
    carrera_id = db.Column(db.Integer, db.ForeignKey("carreras.id"), nullable=False)
    curso_id = db.Column(
        db.Integer,
        db.ForeignKey("cursos.id", ondelete="SET NULL"),
        nullable=True,
    )

    faculty = db.relationship("Faculty", back_populates="teachers")
    career = db.relationship("Career", back_populates="teachers")
    course = db.relationship("Course", back_populates="teachers")
    reviews = db.relationship(
        "Review",
        back_populates="teacher",
        cascade="all, delete-orphan",
        lazy=True,
    )

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellidos}"

    @property
    def promedio(self) -> float:
        ratings = [
            review.calificacion for review in self.reviews if review.estado == ReviewStatus.VISIBLE
        ]
        if not ratings:
            return 0.0
        return round(reduce(lambda total, value: total + value, ratings, 0) / len(ratings), 2)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nombres": self.nombres,
            "apellidos": self.apellidos,
            "correo": self.correo,
            "facultad_id": self.facultad_id,
            "carrera_id": self.carrera_id,
            "curso_id": self.curso_id,
            "facultad": self.faculty.nombre if self.faculty else None,
            "carrera": self.career.nombre if self.career else None,
            "curso": self.course.nombre if self.course else None,
            "fotografia": self.fotografia,
            "promedio": self.promedio,
            "resenas": len([review for review in self.reviews if review.estado == ReviewStatus.VISIBLE]),
        }
