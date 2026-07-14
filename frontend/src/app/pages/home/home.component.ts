import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <section class="hero">
      <h1>UTP+ EVALUA</h1>
      <p>Plataforma donde los alumnos califican docentes, cursos y carreras.</p>
      <a routerLink="/login" class="button">Iniciar sesión</a>
      <a routerLink="/courses" class="button secondary">Explorar cursos</a>
    </section>
  `,
})
export class HomeComponent {}
