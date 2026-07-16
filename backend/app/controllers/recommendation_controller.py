from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource

from app.recommendations import RecommendationService

ns = Namespace("recomendaciones", description="Modulo de recomendaciones academicas")
service = RecommendationService()


@ns.route("")
class RecommendationResource(Resource):
    @jwt_required()
    def get(self):
        return service.summary()
