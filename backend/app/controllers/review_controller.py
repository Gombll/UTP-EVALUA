from flask import request
from flask_jwt_extended import get_jwt, jwt_required
from flask_restx import Namespace, Resource

from app.models import Role
from app.schemas.api_models import review_model
from app.services.review_service import ReviewService
from app.utils.pagination import get_pagination_args
from app.utils.security import role_required

ns = Namespace("resenas", description="Resenas anonimas")
service = ReviewService()


@ns.route("")
class ReviewListResource(Resource):
    @jwt_required()
    def get(self):
        args = get_pagination_args(request.args)
        include_student = get_jwt().get("role") == Role.ADMIN
        return service.list(
            include_student=include_student,
            docente_id=request.args.get("docente_id"),
            estado=request.args.get("estado"),
            **args,
        )

    @ns.expect(review_model)
    @role_required(Role.STUDENT, Role.ADMIN)
    def post(self):
        return service.create(request.get_json() or {}), 201


@ns.route("/<int:entity_id>")
class ReviewResource(Resource):
    @jwt_required()
    def get(self, entity_id):
        return service.get(entity_id)

    @role_required(Role.ADMIN)
    def put(self, entity_id):
        return service.update(entity_id, request.get_json() or {})

    @role_required(Role.ADMIN)
    def delete(self, entity_id):
        service.delete(entity_id)
        return "", 204


@ns.route("/<int:entity_id>/reportar")
class ReviewReportResource(Resource):
    @jwt_required()
    def post(self, entity_id):
        data = request.get_json() or {}
        return service.report(entity_id, data.get("motivo"))


@ns.route("/<int:entity_id>/moderar")
class ReviewModerationResource(Resource):
    @role_required(Role.ADMIN)
    def post(self, entity_id):
        data = request.get_json() or {}
        return service.moderate(entity_id, data.get("accion"), data.get("motivo"))
