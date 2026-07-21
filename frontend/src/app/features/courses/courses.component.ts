import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Career, Course, Teacher } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { CareerService, CourseService, TeacherService } from '../../core/services/domain.services';
import { AdminPageComponent, FormField, TableColumn } from '../../shared/admin-page/admin-page.component';

interface CourseCard {
  id: number;
  nombre: string;
  codigo: string;
  carrera: string;
  carreraId: number;
  docentesAsignados: number;
  teachersCount: number;
}

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    AdminPageComponent
  ],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.css'
})
export class CoursesComponent implements OnInit {
  service = inject(CourseService);
  auth = inject(AuthService);
  private readonly careerService = inject(CareerService);
  private readonly teacherService = inject(TeacherService);

  courses: Course[] = [];
  careers: Career[] = [];
  teachers: Teacher[] = [];
  selectedCareerId: number | '' = '';
  searchTerm = '';

  columns: TableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'carrera', label: 'Carrera' }
  ];
  fields: FormField[] = [
    { key: 'codigo', label: 'Código de curso', type: 'text', required: false },
    { key: 'nombre', label: 'Nombre del curso', type: 'text', required: true },
    { key: 'carrera_id', label: 'Carrera', type: 'select', required: true, options: [] }
  ];

  ngOnInit(): void {
    forkJoin({
      careers: this.careerService.list({ per_page: 100 }),
      courses: this.service.list({ per_page: 100 }),
      teachers: this.teacherService.list({ per_page: 100 })
    }).subscribe(({ careers, courses, teachers }) => {
      this.careers = careers.items;
      this.courses = courses.items;
      this.teachers = teachers.items;
      this.fields[2].options = this.careers.map((item) => ({
        value: item.id,
        label: item.nombre
      }));
    });
  }

  get courseCards(): CourseCard[] {
    const search = this.normalize(this.searchTerm);
    return this.courses
      .filter((course) => {
        const matchesCareer =
          !this.selectedCareerId || course.carrera_id === Number(this.selectedCareerId);
        const haystack = this.normalize(`${course.nombre} ${course.codigo ?? ''} ${course.carrera ?? ''}`);
        return matchesCareer && (!search || haystack.includes(search));
      })
      .map((course) => {
        const courseTeachers = this.teachers.filter((t) => t.curso_id === course.id);
        const careerTeachers = this.teachers.filter((t) => t.carrera_id === course.carrera_id);
        return {
          id: course.id,
          nombre: course.nombre,
          codigo: course.codigo ?? 'SIN-COD',
          carrera: course.carrera ?? 'Sin carrera asignada',
          carreraId: course.carrera_id,
          docentesAsignados: courseTeachers.length,
          teachersCount: careerTeachers.length
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
