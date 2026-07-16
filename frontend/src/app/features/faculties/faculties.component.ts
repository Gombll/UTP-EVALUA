import { Component, inject } from '@angular/core';

import { Faculty } from '../../core/models';
import { FacultyService } from '../../core/services/domain.services';
import { AdminPageComponent, FormField, TableColumn } from '../../shared/admin-page/admin-page.component';

@Component({
  selector: 'app-faculties',
  standalone: true,
  imports: [AdminPageComponent],
  template: `
    <app-admin-page
      title="Facultades"
      [columns]="columns"
      [fields]="fields"
      [service]="service"
      [canCreate]="true"
      [canModify]="true"
    />
  `
})
export class FacultiesComponent {
  service = inject(FacultyService);
  columns: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Nombre' }
  ];
  fields: FormField[] = [{ key: 'nombre', label: 'Nombre', type: 'text', required: true }];
}
