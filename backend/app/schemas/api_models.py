from flask_restx import fields

from app.extensions import api

login_model = api.model(
    "Login",
    {
        "correo": fields.String(required=True),
        "password": fields.String(required=True),
    },
)

register_model = api.model(
    "Registro",
    {
        "nombres": fields.String(required=True),
        "correo": fields.String(required=True),
        "password": fields.String(required=True),
    },
)

faculty_model = api.model("Facultad", {"nombre": fields.String(required=True)})

career_model = api.model(
    "Carrera",
    {
        "nombre": fields.String(required=True),
        "facultad_id": fields.Integer(required=True),
    },
)

teacher_model = api.model(
    "Docente",
    {
        "nombres": fields.String(required=True),
        "apellidos": fields.String(required=True),
        "correo": fields.String(required=True),
        "facultad_id": fields.Integer(required=True),
        "carrera_id": fields.Integer(required=True),
        "fotografia": fields.String(),
    },
)

student_model = api.model(
    "Estudiante",
    {
        "nombres": fields.String(required=True),
        "correo": fields.String(required=True),
        "password": fields.String(),
        "active": fields.Boolean(),
    },
)

review_model = api.model(
    "Resena",
    {
        "docente_id": fields.Integer(required=True),
        "calificacion": fields.Integer(required=True, min=1, max=5),
        "comentario": fields.String(required=True),
    },
)
