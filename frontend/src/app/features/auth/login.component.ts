import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  private readonly institutionalEmailPattern = /^[a-z0-9._%+-]+@utp\.edu\.pe$/i;

  mode = signal<'login' | 'register'>('login');
  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.minLength(3), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/)]],
    correo: ['', [Validators.required, Validators.email, Validators.pattern(this.institutionalEmailPattern)]],
    password: ['', [Validators.required, Validators.pattern(this.passwordPattern)]]
  });

  submit(): void {
    if (this.form.invalid || (this.mode() === 'register' && !this.form.value.nombres)) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombres, correo, password } = this.form.getRawValue();
    const request =
      this.mode() === 'login'
        ? this.auth.login(correo, password)
        : this.auth.register(nombres, correo, password);

    request.subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (error) => {
        const message =
          error?.error?.message ?? 'No se pudo conectar con la API o la base de datos.';
        this.snack.open(message, 'Cerrar', { duration: 3600 });
      }
    });
  }

  switchMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  passwordRuleMet(rule: 'length' | 'upper' | 'lower' | 'number'): boolean {
    const password = this.form.controls.password.value;
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password)
    };
    return checks[rule];
  }

  institutionalEmailMet(): boolean {
    return this.institutionalEmailPattern.test(this.form.controls.correo.value);
  }
}

