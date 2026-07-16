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

interface CareerCard {
  id: number;
  name: string;
  faculty: string;
  facultyId: number;
  teachers: number;
  reviews: number;
  rating: number;
}

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    AdminPageComponent
  ],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.css'
})
export class CareersComponent implements OnInit {
  service = inject(CareerService);
  auth = inject(AuthService);
  private readonly facultiesService = inject(FacultyService);
  private readonly teacherService = inject(TeacherService);

  careers: Career[] = [];
  faculties: Faculty[] = [];
  teachers: Teacher[] = [];
  selectedFacultyId: number | '' = '';
  searchTerm = '';

  columns: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'facultad', label: 'Facultad' }
  ];
  fields: FormField[] = [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'facultad_id', label: 'Facultad', type: 'select', required: true, options: [] }
  ];

  ngOnInit(): void {
    forkJoin({
      faculties: this.facultiesService.list({ per_page: 100 }),
      careers: this.service.list({ per_page: 100 }),
      teachers: this.teacherService.list({ per_page: 100 })
    }).subscribe(({ faculties, careers, teachers }) => {
      this.faculties = faculties.items;
      this.careers = careers.items;
      this.teachers = teachers.items;
      this.fields[1].options = this.faculties.map((item) => ({
        value: item.id,
        label: item.nombre
      }));
    });
  }

  get careerCards(): CareerCard[] {
    const search = this.normalize(this.searchTerm);
    return this.careers
      .filter((career) => {
        const matchesFaculty =
          !this.selectedFacultyId || career.facultad_id === Number(this.selectedFacultyId);
        const haystack = this.normalize(`${career.nombre} ${career.facultad ?? ''}`);
        return matchesFaculty && (!search || haystack.includes(search));
      })
      .map((career) => {
        const careerTeachers = this.teachers.filter((teacher) => teacher.carrera_id === career.id);
        const reviews = careerTeachers.reduce((total, teacher) => total + (teacher.resenas ?? 0), 0);
        const weighted = careerTeachers.reduce(
          (total, teacher) => total + (teacher.promedio ?? 0) * (teacher.resenas ?? 0),
          0
        );
        return {
          id: career.id,
          name: career.nombre,
          faculty: career.facultad ?? 'Sin facultad',
          facultyId: career.facultad_id,
          teachers: careerTeachers.length,
          reviews,
          rating: reviews ? Number((weighted / reviews).toFixed(1)) : 0
        };
      })
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews || a.name.localeCompare(b.name));
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
