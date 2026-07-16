import re

from werkzeug.exceptions import BadRequest


def require_fields(data: dict, fields: list[str]) -> None:
    missing = [field for field in fields if data.get(field) in (None, "")]
    if missing:
        raise BadRequest(f"Campos requeridos: {', '.join(missing)}")


def validate_email(value: str) -> str:
    email = (value or "").strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise BadRequest("Ingresa un correo electrónico válido.")
    return email


def validate_person_name(value: str) -> str:
    name = re.sub(r"\s+", " ", (value or "").strip())
    if len(name) < 3:
        raise BadRequest("Ingresa tu nombre completo.")
    if any(not (char.isalpha() or char == " ") for char in name):
        raise BadRequest("El nombre solo puede incluir letras y espacios.")
    return name


def validate_password(value: str) -> None:
    password = value or ""
    if len(password) < 8:
        raise BadRequest("La contraseña debe tener al menos 8 caracteres.")
    if not re.search(r"[A-Z]", password):
        raise BadRequest("La contraseña debe incluir una letra mayúscula.")
    if not re.search(r"[a-z]", password):
        raise BadRequest("La contraseña debe incluir una letra minúscula.")
    if not re.search(r"\d", password):
        raise BadRequest("La contraseña debe incluir un número.")


def validate_rating(value: int) -> None:
    try:
        rating = int(value)
    except (TypeError, ValueError) as exc:
        raise BadRequest("La calificación debe ser un número entre 1 y 5.") from exc
    if rating < 1 or rating > 5:
        raise BadRequest("La calificación debe estar entre 1 y 5.")


def validate_review_comment(value: str) -> str:
    comment = re.sub(r"\s+", " ", (value or "").strip())
    if len(comment) < 12:
        raise BadRequest("El comentario debe tener al menos 12 caracteres.")
    if len(comment) > 600:
        raise BadRequest("El comentario no puede superar los 600 caracteres.")
    if re.search(r"https?://|www\.|\.com\b|\.pe\b|\.net\b", comment, re.IGNORECASE):
        raise BadRequest("El comentario no puede incluir enlaces.")
    if re.search(r"(.)\1{7,}", comment):
        raise BadRequest("El comentario parece contenido repetido.")

    words = re.findall(r"[A-Za-z0-9]+", comment)
    letters = re.findall(r"[A-Za-z]", comment)
    if len("".join(letters)) < 8:
        raise BadRequest("El comentario debe incluir texto descriptivo.")
    if words and len(set(word.lower() for word in words)) <= 2 and len(words) >= 6:
        raise BadRequest("El comentario no puede ser texto repetido.")

    uppercase = sum(1 for char in letters if char.isupper())
    if len(letters) >= 20 and uppercase / len(letters) > 0.75:
        raise BadRequest("Evita escribir el comentario casi todo en mayúsculas.")

    blocked_terms = {
        "idiota",
        "imbecil",
        "estupido",
        "basura",
        "mierda",
        "inutil",
        "corrupto",
    }
    normalized_words = {word.lower() for word in words}
    if blocked_terms.intersection(normalized_words):
        raise BadRequest("El comentario contiene lenguaje ofensivo.")

    return comment


def validate_report_reason(value: str | None) -> str:
    reason = re.sub(r"\s+", " ", (value or "").strip())
    if not reason:
        return "Reporte sin motivo específico."
    if len(reason) > 255:
        raise BadRequest("El motivo del reporte no puede superar los 255 caracteres.")
    return reason
