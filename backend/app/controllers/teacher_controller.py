from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.models import Role
from app.schemas.api_models import teacher_model
from app.services.teacher_service import TeacherService
from app.utils.pagination import get_pagination_args
from app.utils.security import role_required

ns = Namespace("docentes", description="CRUD de docentes")
service = TeacherService()


@ns.route("")
class TeacherListResource(Resource):
    @jwt_required()
    def get(self):
        args = get_pagination_args(request.args)
        return service.list(
            facultad_id=request.args.get("facultad_id"),
            carrera_id=request.args.get("carrera_id"),
            curso_id=request.args.get("curso_id"),
            **args,
        )

    @ns.expect(teacher_model)
    @role_required(Role.ADMIN)
    def post(self):
        return service.create(request.get_json() or {}), 201


@ns.route("/<int:entity_id>")
class TeacherResource(Resource):
    @jwt_required()
    def get(self, entity_id):
        return service.get(entity_id)

    @ns.expect(teacher_model)
    @role_required(Role.ADMIN)
    def put(self, entity_id):
        return service.update(entity_id, request.get_json() or {})

    @role_required(Role.ADMIN)
    def delete(self, entity_id):
        service.delete(entity_id)
        return "", 204
