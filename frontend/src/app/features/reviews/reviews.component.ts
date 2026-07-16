import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { Career, Faculty, Teacher } from '../../core/models';
import {
  CareerService,
  FacultyService,
  ReviewService,
  TeacherService
} from '../../core/services/domain.services';

interface EvaluationQuestion {
  id: string;
  label: string;
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.css'
})
export class ReviewsComponent implements OnInit {
  private readonly facultyService = inject(FacultyService);
  private readonly careerService = inject(CareerService);
  private readonly teacherService = inject(TeacherService);
  private readonly reviews = inject(ReviewService);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  faculties: Faculty[] = [];
  careers: Career[] = [];
  teacherOptions: Teacher[] = [];
  selectedFacultyId: number | '' = '';
  selectedCareerId: number | '' = '';
  selectedTeacherId: number | '' = '';
  comment = '';

  readonly scale = ['Insatisfactorio', 'Regular', 'Satisfecho', 'Muy satisfecho', 'Excelente'];
  readonly questions: EvaluationQuestion[] = [
    { id: 'claridad', label: 'Claridad y dominio del facilitador' },
    { id: 'material', label: 'Utilidad del material de apoyo' },
    { id: 'practicas', label: 'Actividades prácticas' },
    { id: 'organizacion', label: 'Organización y logística' },
    { id: 'objetivos', label: 'Logro de los objetivos académicos' }
  ];
  ratings: Record<string, number> = {
    claridad: 4,
    material: 0,
    practicas: 0,
    organizacion: 0,
    objetivos: 0
  };

  ngOnInit(): void {
    forkJoin({
      faculties: this.facultyService.list({ per_page: 100 }),
      careers: this.careerService.list({ per_page: 100 }),
      teachers: this.teacherService.list({ per_page: 100 })
    }).subscribe(({ faculties, careers, teachers }) => {
      this.faculties = faculties.items;
      this.careers = careers.items;
      this.teacherOptions = teachers.items;
      this.applyInitialSelection();
    });
  }

  get filteredCareers(): Career[] {
    if (!this.selectedFacultyId) {
      return this.careers;
    }
    return this.careers.filter((career) => career.facultad_id === Number(this.selectedFacultyId));
  }

  get filteredTeachers(): Teacher[] {
    if (!this.selectedCareerId) {
      return [];
    }
    return this.teacherOptions.filter(
      (teacher) =>
        teacher.carrera_id === Number(this.selectedCareerId) &&
        (!this.selectedFacultyId || teacher.facultad_id === Number(this.selectedFacultyId))
    );
  }

  onFacultyChange(): void {
    this.selectedCareerId = '';
    this.selectedTeacherId = '';
  }

  onCareerChange(): void {
    const career = this.careers.find((item) => item.id === Number(this.selectedCareerId));
    this.selectedFacultyId = career?.facultad_id ?? this.selectedFacultyId;
    this.selectedTeacherId = this.filteredTeachers[0]?.id ?? '';
  }

  setRating(questionId: string, value: number): void {
    this.ratings[questionId] = value;
  }

  submit(): void {
    const ratingValues = Object.values(this.ratings).filter((value) => value > 0);
    if (!this.selectedFacultyId || !this.selectedCareerId || !this.selectedTeacherId) {
      this.snack.open('Selecciona facultad, carrera y docente antes de evaluar.', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    if (ratingValues.length !== this.questions.length) {
      this.snack.open('Completa todos los criterios de evaluación.', 'Cerrar', { duration: 2800 });
      return;
    }

    const average = Math.round(
      ratingValues.reduce((total, value) => total + value, 0) / ratingValues.length
    );

    this.reviews
      .create({
        docente_id: Number(this.selectedTeacherId),
        calificacion: average,
        comentario: this.comment || 'Evaluación registrada sin comentario adicional.'
      })
      .subscribe({
        next: () => {
          this.comment = '';
          this.router.navigate(['/dashboard'], {
            state: {
              reviewSuccess: true,
              message: 'Tu reseña anónima fue registrada correctamente y ya actualiza los indicadores.'
            }
          });
        },
        error: (error) => {
          const message = error?.error?.message ?? 'No se pudo enviar la evaluación.';
          this.snack.open(message, 'Cerrar', { duration: 3400 });
        }
      });
  }

  selectedCareerName(): string {
    const career = this.careers.find((item) => item.id === Number(this.selectedCareerId));
    return career?.nombre ?? 'Selecciona una carrera';
  }

  selectedTeacherName(): string {
    const teacher = this.teacherOptions.find((item) => item.id === Number(this.selectedTeacherId));
    return teacher ? `${teacher.nombres} ${teacher.apellidos}` : 'Selecciona un docente';
  }

  selectedFacultyName(): string {
    const faculty = this.faculties.find((item) => item.id === Number(this.selectedFacultyId));
    return faculty?.nombre ?? 'Sin facultad seleccionada';
  }

  private applyInitialSelection(): void {
    const careerId = Number(this.route.snapshot.queryParamMap.get('carreraId'));
    const teacherId = Number(this.route.snapshot.queryParamMap.get('docenteId'));

    if (teacherId) {
      const teacher = this.teacherOptions.find((item) => item.id === teacherId);
      this.selectedTeacherId = teacher?.id ?? '';
      this.selectedCareerId = teacher?.carrera_id ?? '';
      this.selectedFacultyId = teacher?.facultad_id ?? '';
      return;
    }

    if (careerId) {
      const career = this.careers.find((item) => item.id === careerId);
      this.selectedCareerId = career?.id ?? '';
      this.selectedFacultyId = career?.facultad_id ?? '';
      this.selectedTeacherId = this.filteredTeachers[0]?.id ?? '';
      return;
    }

    const firstCareerWithTeacher = this.careers.find((career) =>
      this.teacherOptions.some((teacher) => teacher.carrera_id === career.id)
    );
    this.selectedCareerId = firstCareerWithTeacher?.id ?? '';
    this.selectedFacultyId = firstCareerWithTeacher?.facultad_id ?? '';
    this.selectedTeacherId = this.filteredTeachers[0]?.id ?? '';
  }
}
