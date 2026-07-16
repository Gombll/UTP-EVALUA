from werkzeug.exceptions import NotFound

from app.utils.pagination import paginate_response


class BaseService:
    def __init__(self, repository) -> None:
        self.repository = repository

    def list(self, **kwargs) -> dict:
        pagination = self.repository.list(**kwargs)
        return paginate_response(pagination)

    def get(self, entity_id: int) -> dict:
        return self._get_entity(entity_id).to_dict()

    def create(self, data: dict) -> dict:
        return self.repository.create(data).to_dict()

    def update(self, entity_id: int, data: dict) -> dict:
        entity = self._get_entity(entity_id)
        return self.repository.update(entity, data).to_dict()

    def delete(self, entity_id: int) -> None:
        self.repository.delete(self._get_entity(entity_id))

    def _get_entity(self, entity_id: int):
        entity = self.repository.get(entity_id)
        if not entity:
            raise NotFound("Recurso no encontrado.")
        return entity
