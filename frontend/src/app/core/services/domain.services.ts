import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Career, Dashboard, Faculty, Review, Teacher, User } from '../models';
import { CrudService } from './crud.service';

@Injectable({ providedIn: 'root' })
export class FacultyService extends CrudService<Faculty> {
  constructor(http: HttpClient) {
    super(http, 'facultades');
  }
}

@Injectable({ providedIn: 'root' })
export class CareerService extends CrudService<Career> {
  constructor(http: HttpClient) {
    super(http, 'carreras');
  }
}

@Injectable({ providedIn: 'root' })
export class TeacherService extends CrudService<Teacher> {
  constructor(http: HttpClient) {
    super(http, 'docentes');
  }
}

@Injectable({ providedIn: 'root' })
export class StudentService extends CrudService<User> {
  constructor(http: HttpClient) {
    super(http, 'estudiantes');
  }
}

@Injectable({ providedIn: 'root' })
export class ReviewService extends CrudService<Review> {
  constructor(http: HttpClient) {
    super(http, 'resenas');
  }

  report(id: number, motivo: string) {
    return this.http.post<Review>(`${this.apiUrl}/resenas/${id}/reportar`, { motivo });
  }

  moderate(id: number, accion: 'aprobar' | 'ocultar', motivo = '') {
    return this.http.post<Review>(`${this.apiUrl}/resenas/${id}/moderar`, { accion, motivo });
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = 'http://localhost:5000/api/dashboard';

  constructor(private readonly http: HttpClient) {}

  getSummary(): Observable<Dashboard> {
    return this.http.get<Dashboard>(this.apiUrl);
  }
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly apiUrl = 'http://localhost:5000/api/reportes';

  constructor(private readonly http: HttpClient) {}

  analytics(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/analytics`);
  }

  prolog(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/prolog`);
  }

  charts(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/graficos`);
  }

  chartData(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/graficos-data`);
  }

  excelUrl(): string {
    return `${this.apiUrl}/excel`;
  }

  csvUrl(): string {
    return `${this.apiUrl}/csv`;
  }
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly apiUrl = 'http://localhost:5000/api/recomendaciones';

  constructor(private readonly http: HttpClient) {}

  recommendations(): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(this.apiUrl);
  }
}
