import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  private readonly auth = inject(AuthService);
  user = this.auth.currentUser;
  isAdmin = computed(() => this.auth.isAdmin());
  roleLabel = computed(() => (this.isAdmin() ? 'Administrador' : 'Estudiante'));
  roleIcon = computed(() => (this.isAdmin() ? 'admin_panel_settings' : 'school'));

  logout(): void {
    this.auth.logout();
  }
}
