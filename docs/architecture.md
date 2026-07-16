# Arquitectura UTP+EVALUA

```mermaid
flowchart TD
    A[Angular 20 + Angular Material] --> B[Flask REST API]
    B --> C[Service Layer]
    C --> D[Repository Layer]
    D --> E[SQLAlchemy ORM]
    E --> F[(MySQL 8)]
    F --> G[Analytics Module pandas + NumPy]
    F --> H[Logic Module PySWIP]
```

## Capas

- `controllers`: recursos RESTX, validacion de acceso y entrada HTTP.
- `services`: reglas de negocio, composicion y funciones puras de calculo.
- `repositories`: acceso a datos, paginacion, busqueda, filtros y ordenamiento.
- `models`: entidades SQLAlchemy y relaciones.
- `analytics`: reportes con pandas, NumPy, Matplotlib y OpenPyXL.
- `logic`: hechos y reglas Prolog consumidos desde PySWIP.
