import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiPage } from '../models';

export interface QueryOptions {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}

export class CrudService<T> {
  protected readonly apiUrl = 'http://localhost:5000/api';

  constructor(
    protected readonly http: HttpClient,
    private readonly endpoint: string
  ) {}

  list(options: QueryOptions = {}): Observable<ApiPage<T>> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiPage<T>>(`${this.apiUrl}/${this.endpoint}`, { params });
  }

  get(id: number): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  create(payload: Partial<T>): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${this.endpoint}`, payload);
  }

  update(id: number, payload: Partial<T>): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${this.endpoint}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }
}

