import logging
from typing import Type

from flask import Flask

from app.config.settings import Config
from app.extensions import api, cors, db, jwt, migrate
from app.middleware.errors import register_error_handlers
from app.routes.api import register_namespaces


def create_app(config_class: Type[Config] = Config) -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config.from_object(config_class)

    logging.basicConfig(level=app.config["LOG_LEVEL"])

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )
    migrate.init_app(app, db)
    api.init_app(app)

    register_namespaces(api)
    register_error_handlers(app)
    register_cli(app)
    initialize_database(app)

    return app


def initialize_database(app: Flask) -> None:
    if not (app.config.get("AUTO_CREATE_DB") or app.config.get("AUTO_SEED_DATABASE")):
        return

    from app.database.schema_compat import ensure_review_moderation_schema
    from app.database.seed import seed_database

    with app.app_context():
        if app.config.get("AUTO_CREATE_DB"):
            db.create_all()
            ensure_review_moderation_schema()
        if app.config.get("AUTO_SEED_DATABASE"):
            seed_database()


def register_cli(app: Flask) -> None:
    from app.database.seed import seed_database

    @app.cli.command("seed")
    def seed() -> None:
        seed_database()
        print("Datos semilla insertados correctamente.")
