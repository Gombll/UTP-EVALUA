from datetime import datetime

from app.extensions import db
from app.models.base_model import BaseModel


class ReviewStatus:
    VISIBLE = "visible"
    REPORTED = "reportada"
    HIDDEN = "oculta"


class Review(BaseModel):
    __tablename__ = "resenas"

    docente_id = db.Column(
        db.Integer,
        db.ForeignKey("docentes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    estudiante_id = db.Column(
        db.Integer,
        db.ForeignKey("estudiantes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    calificacion = db.Column(db.Integer, nullable=False)
    comentario = db.Column(db.Text, nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    estado = db.Column(db.String(20), default=ReviewStatus.VISIBLE, nullable=False, index=True)
    motivo_reporte = db.Column(db.String(255), nullable=True)
    fecha_reporte = db.Column(db.DateTime, nullable=True)
    reportado_por_id = db.Column(
        db.Integer,
        db.ForeignKey("estudiantes.id", ondelete="SET NULL"),
        nullable=True,
    )

    teacher = db.relationship("Teacher", back_populates="reviews")
    student = db.relationship("User", back_populates="reviews", foreign_keys=[estudiante_id])
    reporter = db.relationship("User", foreign_keys=[reportado_por_id])

    __table_args__ = (
        db.CheckConstraint("calificacion >= 1 AND calificacion <= 5", "ck_rating_range"),
        db.UniqueConstraint("docente_id", "estudiante_id", name="uq_resena_estudiante_docente"),
    )

    def to_dict(self, include_student: bool = False) -> dict:
        data = {
            "id": self.id,
            "docente_id": self.docente_id,
            "docente": self.teacher.nombre_completo if self.teacher else None,
            "carrera": self.teacher.career.nombre if self.teacher and self.teacher.career else None,
            "curso": self.teacher.course.nombre if self.teacher and self.teacher.course else None,
            "calificacion": self.calificacion,
            "comentario": self.comentario,
            "fecha": self.fecha.isoformat(),
            "estado": self.estado,
            "motivo_reporte": self.motivo_reporte,
            "fecha_reporte": self.fecha_reporte.isoformat() if self.fecha_reporte else None,
        }
        if include_student:
            data["estudiante_id"] = self.estudiante_id
            data["estudiante"] = self.student.nombres if self.student else None
            data["reportado_por_id"] = self.reportado_por_id
        return data
