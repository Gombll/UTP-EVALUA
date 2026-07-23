import { Component, inject } from '@angular/core';

import { User } from '../../core/models';
import { StudentService } from '../../core/services/domain.services';
import { AdminPageComponent, FormField, TableColumn } from '../../shared/admin-page/admin-page.component';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [AdminPageComponent],
  template: `
    <app-admin-page
      title="Estudiantes"
      [columns]="columns"
      [fields]="fields"
      [service]="service"
      [canCreate]="true"
      [canModify]="true"
    />
  `
})
export class StudentsComponent {
  service = inject(StudentService);
  columns: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'nombres', label: 'Nombres' },
    { key: 'correo', label: 'Correo' },
    { key: 'active', label: 'Activo' }
  ];
  fields: FormField[] = [
    { key: 'nombres', label: 'Nombres', type: 'text', required: true },
    {
      key: 'correo',
      label: 'Correo',
      type: 'email',
      required: true,
      hint: 'Formato institucional: ejemplo@utp.edu.pe',
      pattern: /^[a-z0-9._%+-]+@utp\.edu\.pe$/i,
      patternError: 'Solo se permiten correos institucionales @utp.edu.pe.'
    },
    {
      key: 'password',
      label: 'Contraseña',
      type: 'password',
      requiredOnCreate: true,
      hint: 'Obligatoria al crear. Déjala vacía al editar si no deseas cambiarla.'
    }
  ];
}
