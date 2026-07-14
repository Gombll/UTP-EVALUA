from flask import jsonify, request, session
from .database import db, User, Career, Course, Teacher, Review


def serialize_review(review):
    return {
        "id": review.id,
        "student_name": review.student_name,
        "comment": review.comment,
        "rating": review.rating,
        "created_at": review.created_at.isoformat(),
    }


def serialize_teacher(teacher, include_reviews=False):
    data = {
        "id": teacher.id,
        "name": teacher.name,
        "specialty": teacher.specialty,
        "biography": teacher.biography,
        "course_id": teacher.course_id,
        "course_name": teacher.course.name,
        "career_name": teacher.course.career.name,
        "average_rating": teacher.average_rating(),
    }
    if include_reviews:
        data["reviews"] = [serialize_review(review) for review in teacher.reviews]
    return data


def serialize_course(course, include_teachers=False):
    data = {
        "id": course.id,
        "name": course.name,
        "career_id": course.career_id,
        "career_name": course.career.name,
    }
    if include_teachers:
        data["teachers"] = [serialize_teacher(t) for t in course.teachers]
    return data


def serialize_career(career, include_courses=False):
    data = {
        "id": career.id,
        "name": career.name,
    }
    if include_courses:
        data["courses"] = [serialize_course(course) for course in career.courses]
    return data


def auth_required(role=None):
    user_role = session.get("role")
    if not user_role:
        return jsonify({"error": "Debe iniciar sesión"}), 401
    if role and user_role != role:
        return jsonify({"error": "Acceso denegado"}), 403
    return None


def register_routes(app):
    @app.route("/api/me")
    def current_user():
        if "user_id" not in session:
            return jsonify({"user": None})
        return jsonify({
            "user": {
                "username": session.get("username"),
                "role": session.get("role"),
            }
        })

    @app.route("/api/register", methods=["POST"])
    def register():
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        if not username or not password:
            return jsonify({"error": "Usuario y contraseña son obligatorios"}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({"error": "El usuario ya existe"}), 400
        new_student = User(username=username, password=password, role="alumno")
        db.session.add(new_student)
        db.session.commit()
        return jsonify({"message": "Registro exitoso", "user": {"username": username, "role": "alumno"}}), 201

    @app.route("/api/login", methods=["POST"])
    def login():
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()
        user = User.query.filter_by(username=username, password=password).first()
        if not user:
            return jsonify({"error": "Usuario o contraseña incorrectos"}), 401
        session["user_id"] = user.id
        session["username"] = user.username
        session["role"] = user.role
        return jsonify({"message": "Inicio de sesión correcto", "user": {"username": user.username, "role": user.role}})

    @app.route("/api/logout")
    def logout():
        session.clear()
        return jsonify({"message": "Sesión cerrada"})

    @app.route("/api/careers")
    def list_careers():
        careers = Career.query.order_by(Career.name).all()
        return jsonify([serialize_career(career) for career in careers])

    @app.route("/api/careers/<int:career_id>/courses")
    def career_courses(career_id):
        career = Career.query.get_or_404(career_id)
        return jsonify([serialize_course(course) for course in career.courses])

    @app.route("/api/courses")
    def list_courses():
        courses = Course.query.order_by(Course.name).all()
        return jsonify([serialize_course(course) for course in courses])

    @app.route("/api/courses/<int:course_id>/teachers")
    def course_teachers(course_id):
        course = Course.query.get_or_404(course_id)
        return jsonify([serialize_teacher(teacher) for teacher in course.teachers])

    @app.route("/api/teachers/<int:teacher_id>")
    def teacher_detail(teacher_id):
        teacher = Teacher.query.get_or_404(teacher_id)
        return jsonify(serialize_teacher(teacher, include_reviews=True))

    @app.route("/api/teachers/<int:teacher_id>/reviews", methods=["POST"])
    def teacher_review(teacher_id):
        auth = auth_required(role="alumno")
        if auth:
            return auth
        teacher = Teacher.query.get_or_404(teacher_id)
        data = request.get_json() or {}
        rating = int(data.get("rating", 0))
        comment = (data.get("comment") or "").strip()
        if rating < 1 or rating > 5:
            return jsonify({"error": "La calificación debe ser entre 1 y 5 estrellas"}), 400
        review = Review(student_name=session.get("username", "Estudiante"), comment=comment, rating=rating, teacher=teacher)
        db.session.add(review)
        db.session.commit()
        return jsonify({"message": "Reseña enviada con éxito", "review": serialize_review(review)}), 201

    @app.route("/api/admin/teachers")
    def admin_teachers():
        auth = auth_required(role="admin")
        if auth:
            return auth
        teachers = Teacher.query.order_by(Teacher.name).all()
        return jsonify([serialize_teacher(teacher) for teacher in teachers])

    @app.route("/api/admin/courses")
    def admin_courses():
        auth = auth_required(role="admin")
        if auth:
            return auth
        courses = Course.query.order_by(Course.name).all()
        return jsonify([serialize_course(course, include_teachers=True) for course in courses])

    @app.route("/api/admin/teachers", methods=["POST"])
    def add_teacher():
        auth = auth_required(role="admin")
        if auth:
            return auth
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        specialty = (data.get("specialty") or "Docente").strip()
        biography = (data.get("biography") or "").strip()
        course_id = data.get("course_id")
        if not name or not course_id:
            return jsonify({"error": "Nombre y curso son obligatorios"}), 400
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"error": "Curso no válido"}), 400
        teacher = Teacher(name=name, specialty=specialty, biography=biography, course=course)
        db.session.add(teacher)
        db.session.commit()
        return jsonify({"message": "Docente agregado correctamente", "teacher": serialize_teacher(teacher)}), 201

    @app.route("/api/admin/courses", methods=["POST"])
    def add_course():
        auth = auth_required(role="admin")
        if auth:
            return auth
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        career_id = data.get("career_id")
        if not name or not career_id:
            return jsonify({"error": "Nombre de curso y carrera son obligatorios"}), 400
        career = Career.query.get(career_id)
        if not career:
            return jsonify({"error": "Carrera no válida"}), 400
        course = Course(name=name, career=career)
        db.session.add(course)
        db.session.commit()
        return jsonify({"message": "Curso agregado correctamente", "course": serialize_course(course)}), 201
