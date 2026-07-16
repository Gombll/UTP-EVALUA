from datetime import datetime, timedelta

from flask_jwt_extended import get_jwt_identity
from werkzeug.exceptions import BadRequest

from app.extensions import db
from app.models.review import ReviewStatus
from app.repositories import ReviewRepository
from app.services.base_service import BaseService
from app.utils.pagination import paginate_response
from app.utils.validators import (
    require_fields,
    validate_rating,
    validate_report_reason,
    validate_review_comment,
)

MAX_REVIEWS_PER_HOUR = 3
MAX_REVIEWS_PER_DAY = 10


class ReviewService(BaseService):
    def __init__(self) -> None:
        super().__init__(ReviewRepository())

    def list(self, include_student: bool = False, **kwargs) -> dict:
        filters = kwargs.pop("filters", {})
        if "docente_id" in kwargs:
            filters["docente_id"] = kwargs.pop("docente_id")
        estado = kwargs.pop("estado", None)
        if include_student and estado:
            filters["estado"] = estado
        pagination = self.repository.list(
            filters=filters,
            include_hidden=include_student,
            **kwargs,
        )
        return paginate_response(
            pagination,
            lambda review: review.to_dict(include_student=include_student),
        )

    def get(self, entity_id: int) -> dict:
        return self._get_entity(entity_id).to_dict()

    def create(self, data: dict, estudiante_id: int | None = None) -> dict:
        require_fields(data, ["docente_id", "calificacion", "comentario"])
        validate_rating(data["calificacion"])
        data["comentario"] = validate_review_comment(data["comentario"])
        student_id = estudiante_id or int(get_jwt_identity())
        teacher_id = int(data["docente_id"])

        existing = self.repository.find_by_student_teacher(student_id, teacher_id)
        if existing:
            existing.calificacion = int(data["calificacion"])
            existing.comentario = data["comentario"]
            if existing.estado == ReviewStatus.VISIBLE:
                existing.motivo_reporte = None
                existing.fecha_reporte = None
                existing.reportado_por_id = None
            else:
                existing.estado = ReviewStatus.REPORTED
                existing.motivo_reporte = "Resena actualizada y pendiente de moderacion."
                existing.fecha_reporte = datetime.utcnow()
            db.session.commit()
            return existing.to_dict()

        self._enforce_rate_limit(student_id)
        data["docente_id"] = teacher_id
        data["calificacion"] = int(data["calificacion"])
        data["estudiante_id"] = student_id
        data["estado"] = ReviewStatus.VISIBLE
        return self.repository.create(data).to_dict()

    def report(self, entity_id: int, reason: str | None = None) -> dict:
        review = self._get_entity(entity_id)
        if review.estado == ReviewStatus.HIDDEN:
            raise BadRequest("La resena ya fue ocultada por moderacion.")
        review.estado = ReviewStatus.REPORTED
        review.motivo_reporte = validate_report_reason(reason)
        review.fecha_reporte = datetime.utcnow()
        review.reportado_por_id = int(get_jwt_identity())
        db.session.commit()
        return review.to_dict()

    def moderate(self, entity_id: int, action: str, reason: str | None = None) -> dict:
        review = self._get_entity(entity_id)
        if action == "aprobar":
            review.estado = ReviewStatus.VISIBLE
            review.motivo_reporte = None
            review.fecha_reporte = None
            review.reportado_por_id = None
        elif action == "ocultar":
            review.estado = ReviewStatus.HIDDEN
            review.motivo_reporte = validate_report_reason(reason)
            review.fecha_reporte = datetime.utcnow()
        else:
            raise BadRequest("Accion de moderacion invalida.")
        db.session.commit()
        return review.to_dict(include_student=True)

    def _enforce_rate_limit(self, estudiante_id: int) -> None:
        now = datetime.utcnow()
        if self.repository.count_since(estudiante_id, now - timedelta(hours=1)) >= MAX_REVIEWS_PER_HOUR:
            raise BadRequest("Alcanzaste el limite de 3 resenas por hora.")
        if self.repository.count_since(estudiante_id, now - timedelta(days=1)) >= MAX_REVIEWS_PER_DAY:
            raise BadRequest("Alcanzaste el limite de 10 resenas por dia.")
