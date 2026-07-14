from flask import Flask
from flask_cors import CORS
from .config import SECRET_KEY, SQLALCHEMY_DATABASE_URI
from .database import db, init_db
from .routes import register_routes


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JSON_SORT_KEYS"] = False

    db.init_app(app)
    CORS(app, supports_credentials=True)

    with app.app_context():
        init_db()

    register_routes(app)
    return app
