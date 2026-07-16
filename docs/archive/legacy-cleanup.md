# Legacy cleanup

This note records files removed from the active application tree during the structure cleanup.

## Backend

- `backend/routes.py` was removed.
- `backend/database.py` and `backend/config.py` were marked as retired stubs because Windows denied deletion. They should not be imported by active code.

The active backend lives under `backend/app`, uses Flask-RESTX, JWT, SQLAlchemy models in `backend/app/models`, and MySQL configuration through `backend/app/config/settings.py`.

## Frontend

- `frontend/src/app/app.module.ts`
- `frontend/src/app/app-routing.module.ts`
- `frontend/src/app/services/api.service.ts`
- `frontend/src/app/pages/home/home.component.ts`
- `frontend/src/app/pages/login/login.component.ts`
- `frontend/src/app/pages/courses/course-list.component.ts`
- `frontend/src/app/pages/teacher/teacher-detail.component.ts`

These files belonged to an older NgModule/pages implementation. The active frontend uses standalone Angular bootstrapping from `frontend/src/main.ts`, routing from `frontend/src/app/app.routes.ts`, feature components under `frontend/src/app/features`, shared UI under `frontend/src/app/shared`, and API services under `frontend/src/app/core/services`.

## Generated files

- `__pycache__/app.cpython-314.pyc` was removed from the active tree.

Generated Python bytecode should not live in source control.
