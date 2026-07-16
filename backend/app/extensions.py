from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_restx import Api
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
migrate = Migrate()

api = Api(
    version="1.0",
    title="UTP+EVALUA API",
    description="API REST para evaluacion anonima de docentes universitarios.",
    doc="/docs",
    prefix="/api",
)
