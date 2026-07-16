from typing import Generic, Type, TypeVar

from sqlalchemy import asc, desc, or_

from app.extensions import db

T = TypeVar("T")


class BaseRepository(Generic[T]):
    searchable_fields: tuple[str, ...] = ()

    def __init__(self, model: Type[T]) -> None:
        self._model = model

    @property
    def model(self) -> Type[T]:
        return self._model

    def get(self, entity_id: int) -> T | None:
        return db.session.get(self._model, entity_id)

    def list(
        self,
        page: int = 1,
        per_page: int = 10,
        search: str | None = None,
        sort: str = "id",
        order: str = "asc",
        filters: dict | None = None,
    ):
        query = self._model.query
        filters = filters or {}

        for key, value in filters.items():
            if value not in (None, "") and hasattr(self._model, key):
                query = query.filter(getattr(self._model, key) == value)

        if search and self.searchable_fields:
            clauses = [
                getattr(self._model, field).ilike(f"%{search}%")
                for field in self.searchable_fields
            ]
            query = query.filter(or_(*clauses))

        sort_column = getattr(self._model, sort, self._model.id)
        query = query.order_by(desc(sort_column) if order == "desc" else asc(sort_column))
        return query.paginate(page=page, per_page=per_page, error_out=False)

    def create(self, data: dict) -> T:
        entity = self._model(**data)
        db.session.add(entity)
        db.session.commit()
        return entity

    def update(self, entity: T, data: dict) -> T:
        entity.update(data)
        db.session.commit()
        return entity

    def delete(self, entity: T) -> None:
        db.session.delete(entity)
        db.session.commit()
