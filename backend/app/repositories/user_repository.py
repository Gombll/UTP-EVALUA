from app.models import Role, User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    searchable_fields = ("nombres", "correo")

    def __init__(self) -> None:
        super().__init__(User)

    def find_by_email(self, correo: str) -> User | None:
        return User.query.filter_by(correo=correo).first()

    def students(self, *args, **kwargs):
        kwargs.setdefault("filters", {})
        kwargs["filters"]["role"] = Role.STUDENT
        return self.list(*args, **kwargs)
