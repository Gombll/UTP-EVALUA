from datetime import datetime

from sqlalchemy import asc, desc, or_

from app.models import Review
from app.models.review import ReviewStatus
from app.repositories.base_repository import BaseRepository


class ReviewRepository(BaseRepository[Review]):
    searchable_fields = ("comentario",)

    def __init__(self) -> None:
        super().__init__(Review)

    def list(
        self,
        page: int = 1,
        per_page: int = 10,
        search: str | None = None,
        sort: str = "id",
        order: str = "asc",
        filters: dict | None = None,
        include_hidden: bool = False,
    ):
        query = self.model.query
        filters = filters or {}

        if not include_hidden:
            query = query.filter(self.model.estado == ReviewStatus.VISIBLE)

        for key, value in filters.items():
            if value not in (None, "") and hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)

        if search and self.searchable_fields:
            clauses = [
                getattr(self.model, field).ilike(f"%{search}%")
                for field in self.searchable_fields
            ]
            query = query.filter(or_(*clauses))

        sort_column = getattr(self.model, sort, self.model.id)
        query = query.order_by(desc(sort_column) if order == "desc" else asc(sort_column))
        return query.paginate(page=page, per_page=per_page, error_out=False)

    def find_by_student_teacher(self, estudiante_id: int, docente_id: int) -> Review | None:
        return self.model.query.filter_by(
            estudiante_id=estudiante_id,
            docente_id=docente_id,
        ).first()

    def count_since(self, estudiante_id: int, since: datetime) -> int:
        return self.model.query.filter(
            self.model.estudiante_id == estudiante_id,
            self.model.fecha >= since,
        ).count()
