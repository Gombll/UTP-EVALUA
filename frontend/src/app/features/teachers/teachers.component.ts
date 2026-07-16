import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Career, Faculty, Teacher } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CareerService, FacultyService, TeacherService } from '../../core/services/domain.services';
import { AdminPageComponent, FormField, TableColumn } from '../../shared/admin-page/admin-page.component';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    AdminPageComponent
  ],
  templateUrl: './teachers.component.html',
  styleUrl: './teachers.component.css'
})
export class TeachersComponent implements OnInit {
  service = inject(TeacherService);
  auth = inject(AuthService);
  private readonly facultiesService = inject(FacultyService);
  private readonly careersService = inject(CareerService);

  teachers: Teacher[] = [];
  faculties: Faculty[] = [];
  careers: Career[] = [];
  selectedFacultyId: number | '' = '';
  selectedCareerId: number | '' = '';
  searchTerm = '';

  columns: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'correo', label: 'Correo' },
    { key: 'facultad', label: 'Facultad' },
    { key: 'carrera', label: 'Carrera' },
    { key: 'promedio', label: 'Promedio' }
  ];
  fields: FormField[] = [
    { key: 'nombres', label: 'Nombres', type: 'text', required: true },
    { key: 'apellidos', label: 'Apellidos', type: 'text', required: true },
    { key: 'correo', label: 'Correo', type: 'email', required: true },
    { key: 'facultad_id', label: 'Facultad', type: 'select', required: true, options: [] },
    { key: 'carrera_id', label: 'Carrera', type: 'select', required: true, options: [] },
    { key: 'fotografia', label: 'URL de fotografía', type: 'text' }
  ];

  ngOnInit(): void {
    forkJoin({
      faculties: this.facultiesService.list({ per_page: 100 }),
      careers: this.careersService.list({ per_page: 100 }),
      teachers: this.service.list({ per_page: 100 })
    }).subscribe(({ faculties, careers, teachers }) => {
      this.faculties = faculties.items;
      this.careers = careers.items;
      this.teachers = teachers.items;
      this.fields[3].options = this.faculties.map((item) => ({ value: item.id, label: item.nombre }));
      this.fields[4].options = this.careers.map((item) => ({ value: item.id, label: item.nombre }));
    });
  }

  get filteredCareers(): Career[] {
    if (!this.selectedFacultyId) {
      return this.careers;
    }
    return this.careers.filter((career) => career.facultad_id === Number(this.selectedFacultyId));
  }

  get filteredTeachers(): Teacher[] {
    const search = this.normalize(this.searchTerm);
    return this.teachers
      .filter((teacher) => {
        const matchesFaculty =
          !this.selectedFacultyId || teacher.facultad_id === Number(this.selectedFacultyId);
        const matchesCareer =
          !this.selectedCareerId || teacher.carrera_id === Number(this.selectedCareerId);
        const haystack = this.normalize(
          `${teacher.nombres} ${teacher.apellidos} ${teacher.correo} ${teacher.facultad ?? ''} ${teacher.carrera ?? ''}`
        );
        return matchesFaculty && matchesCareer && (!search || haystack.includes(search));
      })
      .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0));
  }

  onFacultyChange(): void {
    if (
      this.selectedCareerId &&
      !this.filteredCareers.some((career) => career.id === Number(this.selectedCareerId))
    ) {
      this.selectedCareerId = '';
    }
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
