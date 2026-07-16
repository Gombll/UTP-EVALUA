from app.models import Course
from app.repositories.base_repository import BaseRepository


class CourseRepository(BaseRepository[Course]):
    searchable_fields = ("nombre", "codigo")

    def __init__(self) -> None:
        super().__init__(Course)
