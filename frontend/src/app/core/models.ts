export interface User {
  id: number;
  nombres: string;
  correo: string;
  role: 'Administrador' | 'Estudiante';
  active: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface Faculty {
  id: number;
  nombre: string;
}

export interface Career {
  id: number;
  nombre: string;
  facultad_id: number;
  facultad?: string;
}

export interface Teacher {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  facultad_id: number;
  carrera_id: number;
  facultad?: string;
  carrera?: string;
  fotografia?: string;
  promedio?: number;
  resenas?: number;
}

export interface Review {
  id: number;
  docente_id: number;
  docente?: string;
  estudiante_id?: number;
  estudiante?: string;
  calificacion: number;
  comentario: string;
  fecha?: string;
  estado?: 'visible' | 'reportada' | 'oculta';
  motivo_reporte?: string | null;
  fecha_reporte?: string | null;
  reportado_por_id?: number | null;
}

export interface Dashboard {
  cantidad_docentes: number;
  cantidad_estudiantes: number;
  cantidad_resenas: number;
  promedio_general: number;
  top_docentes: Teacher[];
  ultimas_resenas: Review[];
}
