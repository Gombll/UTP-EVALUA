from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.services.dashboard_service import DashboardService

ns = Namespace("dashboard", description="Indicadores generales")
service = DashboardService()


@ns.route("")
class DashboardResource(Resource):
    @jwt_required()
    def get(self):
        return service.summary()
