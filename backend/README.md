# Backend - UTP+ EVALUA

Este es el backend en Python con Flask para `UTP+ EVALUA`.

## Cómo ejecutar

1. Ir a la carpeta del backend:

```powershell
cd c:\Users\USUARIO\Desktop\UTP+EVALUA\backend
```

2. Crear y activar el entorno virtual:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Instalar dependencias:

```powershell
pip install -r requirements.txt
```

4. Ejecutar el backend:

```powershell
python run.py
```

5. La API estará disponible en:

`http://127.0.0.1:5000`

## Endpoints principales

- `GET /api/careers`
- `GET /api/courses`
- `GET /api/courses/<id>/teachers`
- `GET /api/teachers/<id>`
- `POST /api/register`
- `POST /api/login`
- `POST /api/teachers/<id>/reviews`
