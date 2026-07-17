from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.models import Role
from app.schemas.api_models import course_model
from app.services.course_service import CourseService
from app.utils.pagination import get_pagination_args
from app.utils.security import role_required

ns = Namespace("cursos", description="CRUD de cursos académicos")
service = CourseService()


@ns.route("")
class CourseListResource(Resource):
    @jwt_required()
    def get(self):
        args = get_pagination_args(request.args)
        return service.list(carrera_id=request.args.get("carrera_id"), **args)

    @ns.expect(course_model)
    @role_required(Role.ADMIN)
    def post(self):
        return service.create(request.get_json() or {}), 201


@ns.route("/<int:entity_id>")
class CourseResource(Resource):
    @jwt_required()
    def get(self, entity_id):
        return service.get(entity_id)

    @ns.expect(course_model)
    @role_required(Role.ADMIN)
    def put(self, entity_id):
        return service.update(entity_id, request.get_json() or {})

    @role_required(Role.ADMIN)
    def delete(self, entity_id):
        service.delete(entity_id)
        return "", 204
