import logging

from flask import jsonify
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException

from app.extensions import db

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"message": error.description}), error.code

    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        db.session.rollback()
        logger.warning("Error de integridad: %s", error)
        return jsonify({"message": "Registro duplicado o relacion invalida."}), 409

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        db.session.rollback()
        logger.exception("Error inesperado")
        return jsonify({"message": "Error interno del servidor."}), 500
