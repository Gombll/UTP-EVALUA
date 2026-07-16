from flask import request
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.schemas.api_models import login_model, register_model
from app.services.auth_service import AuthService

ns = Namespace("auth", description="Autenticacion JWT")
service = AuthService()


@ns.route("/register")
class RegisterResource(Resource):
    @ns.expect(register_model)
    def post(self):
        return service.register(request.get_json() or {}), 201


@ns.route("/login")
class LoginResource(Resource):
    @ns.expect(login_model)
    def post(self):
        return service.login(request.get_json() or {})


@ns.route("/logout")
class LogoutResource(Resource):
    @jwt_required()
    def post(self):
        return {"message": "Sesion cerrada en el cliente."}
