from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.models import Role
from app.schemas.api_models import career_model
from app.services.career_service import CareerService
from app.utils.pagination import get_pagination_args
from app.utils.security import role_required

ns = Namespace("carreras", description="CRUD de carreras")
service = CareerService()


@ns.route("")
class CareerListResource(Resource):
    @jwt_required()
    def get(self):
        args = get_pagination_args(request.args)
        return service.list(facultad_id=request.args.get("facultad_id"), **args)

    @ns.expect(career_model)
    @role_required(Role.ADMIN)
    def post(self):
        return service.create(request.get_json() or {}), 201


@ns.route("/<int:entity_id>")
class CareerResource(Resource):
    @jwt_required()
    def get(self, entity_id):
        return service.get(entity_id)

    @ns.expect(career_model)
    @role_required(Role.ADMIN)
    def put(self, entity_id):
        return service.update(entity_id, request.get_json() or {})

    @role_required(Role.ADMIN)
    def delete(self, entity_id):
        service.delete(entity_id)
        return "", 204
