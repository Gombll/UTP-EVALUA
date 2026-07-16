from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.models import Role
from app.schemas.api_models import faculty_model
from app.services.faculty_service import FacultyService
from app.utils.pagination import get_pagination_args
from app.utils.security import role_required

ns = Namespace("facultades", description="CRUD de facultades")
service = FacultyService()


@ns.route("")
class FacultyListResource(Resource):
    @jwt_required()
    def get(self):
        return service.list(**get_pagination_args(request.args))

    @ns.expect(faculty_model)
    @role_required(Role.ADMIN)
    def post(self):
        return service.create(request.get_json() or {}), 201


@ns.route("/<int:entity_id>")
class FacultyResource(Resource):
    @jwt_required()
    def get(self, entity_id):
        return service.get(entity_id)

    @ns.expect(faculty_model)
    @role_required(Role.ADMIN)
    def put(self, entity_id):
        return service.update(entity_id, request.get_json() or {})

    @role_required(Role.ADMIN)
    def delete(self, entity_id):
        service.delete(entity_id)
        return "", 204
