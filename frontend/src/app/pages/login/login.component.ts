import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  template: `
    <div class="form-card">
      <h2>Iniciar sesión</h2>
      <form>
        <label>Usuario</label>
        <input type="text" />
        <label>Contraseña</label>
        <input type="password" />
        <button type="button">Ingresar</button>
      </form>
    </div>
  `,
})
export class LoginComponent {}
