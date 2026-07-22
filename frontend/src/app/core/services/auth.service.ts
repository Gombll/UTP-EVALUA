import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { AuthResponse, User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5000/api/auth';
  private readonly tokenKey = 'utp_evalua_token';
  private readonly userKey = 'utp_evalua_user';

  currentUser = signal<User | null>(this.readUser());

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(correo: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { correo, password })
      .pipe(tap((response) => this.persistSession(response)));
  }

  register(nombres: string, correo: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, { nombres, correo, password })
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return Boolean(this.token() && this.currentUser());
  }

  isAdmin(): boolean {
    const role = this.currentUser()?.role?.toLowerCase();
    return role === 'administrador' || role === 'admin';
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(this.tokenKey, response.access_token);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));
    this.currentUser.set(response.user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
