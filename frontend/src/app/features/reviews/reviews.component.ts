import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { Career, Course, Faculty, Teacher } from '../../core/models';
import {
  CareerService,
  CourseService,
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
  private readonly courseService = inject(CourseService);
  private readonly teacherService = inject(TeacherService);
  private readonly reviews = inject(ReviewService);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  faculties: Faculty[] = [];
  careers: Career[] = [];
  courses: Course[] = [];
  teacherOptions: Teacher[] = [];
  selectedFacultyId: number | '' = '';
  selectedCareerId: number | '' = '';
  selectedCourseId: number | '' = '';
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
      courses: this.courseService.list({ per_page: 100 }),
      teachers: this.teacherService.list({ per_page: 100 })
    }).subscribe(({ faculties, careers, courses, teachers }) => {
      this.faculties = faculties.items;
      this.careers = careers.items;
      this.courses = courses.items;
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

  get filteredCourses(): Course[] {
    if (!this.selectedCareerId) {
      return [];
    }

    const coursesByCareer = this.courses.filter(
      (course) => course.carrera_id === Number(this.selectedCareerId)
    );
    const teacher = this.selectedTeacher();
    if (!teacher?.curso_id) {
      return coursesByCareer;
    }

    return coursesByCareer.filter((course) => course.id === teacher.curso_id);
  }

  get filteredTeachers(): Teacher[] {
    if (!this.selectedCareerId) {
      return [];
    }
    return this.teacherOptions.filter(
      (teacher) =>
        teacher.carrera_id === Number(this.selectedCareerId) &&
        (!this.selectedFacultyId || teacher.facultad_id === Number(this.selectedFacultyId)) &&
        (!this.selectedCourseId || teacher.curso_id === Number(this.selectedCourseId))
    );
  }

  onFacultyChange(): void {
    this.selectedCareerId = '';
    this.selectedCourseId = '';
    this.selectedTeacherId = '';
  }

  onCareerChange(): void {
    const career = this.careers.find((item) => item.id === Number(this.selectedCareerId));
    this.selectedFacultyId = career?.facultad_id ?? this.selectedFacultyId;
    this.selectedCourseId = '';
    this.selectedTeacherId = '';
  }

  onCourseChange(): void {
    this.selectedTeacherId = this.filteredTeachers[0]?.id ?? '';
  }

  onTeacherChange(): void {
    const teacher = this.selectedTeacher();
    if (!teacher) {
      this.selectedCourseId = '';
      return;
    }

    this.selectedFacultyId = teacher.facultad_id;
    this.selectedCareerId = teacher.carrera_id;
    this.selectedCourseId = teacher.curso_id ?? '';
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

    const course = this.courses.find((item) => item.id === Number(this.selectedCourseId));
    const coursePrefix = course ? `[Curso: ${course.nombre}] ` : '';
    const finalComment = `${coursePrefix}${this.comment || 'Evaluación del docente registrada.'}`;

    this.reviews
      .create({
        docente_id: Number(this.selectedTeacherId),
        calificacion: average,
        comentario: finalComment
      })
      .subscribe({
        next: () => {
          this.comment = '';
          this.router.navigate(['/dashboard'], {
            state: {
              reviewSuccess: true,
              message: 'Tu reseña y evaluación vinculada al curso fue registrada correctamente en la base de datos.'
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

  selectedCourseName(): string {
    const course = this.courses.find((item) => item.id === Number(this.selectedCourseId));
    return course ? course.nombre : '';
  }

  selectedTeacherName(): string {
    const teacher = this.selectedTeacher();
    return teacher ? `${teacher.nombres} ${teacher.apellidos}` : 'Selecciona un docente';
  }

  selectedFacultyName(): string {
    const faculty = this.faculties.find((item) => item.id === Number(this.selectedFacultyId));
    return faculty?.nombre ?? 'Sin facultad seleccionada';
  }

  private applyInitialSelection(): void {
    const careerId = Number(this.route.snapshot.queryParamMap.get('carreraId'));
    const teacherId = Number(this.route.snapshot.queryParamMap.get('docenteId'));
    const courseId = Number(this.route.snapshot.queryParamMap.get('cursoId'));

    if (courseId) {
      const course = this.courses.find((item) => item.id === courseId);
      if (course) {
        this.selectedCourseId = course.id;
        this.selectedCareerId = course.carrera_id;
        const career = this.careers.find((item) => item.id === course.carrera_id);
        this.selectedFacultyId = career?.facultad_id ?? '';
        this.selectedTeacherId = this.filteredTeachers[0]?.id ?? '';
        return;
      }
    }

    if (teacherId) {
      const teacher = this.teacherOptions.find((item) => item.id === teacherId);
      this.selectedTeacherId = teacher?.id ?? '';
      this.selectedCareerId = teacher?.carrera_id ?? '';
      this.selectedFacultyId = teacher?.facultad_id ?? '';
      this.selectedCourseId = teacher?.curso_id ?? '';
      return;
    }

    if (careerId) {
      const career = this.careers.find((item) => item.id === careerId);
      this.selectedCareerId = career?.id ?? '';
      this.selectedFacultyId = career?.facultad_id ?? '';
      this.selectedTeacherId = '';
      return;
    }

    const firstCareerWithTeacher = this.careers.find((career) =>
      this.teacherOptions.some((teacher) => teacher.carrera_id === career.id)
    );
    this.selectedCareerId = firstCareerWithTeacher?.id ?? '';
    this.selectedFacultyId = firstCareerWithTeacher?.facultad_id ?? '';
    this.selectedTeacherId = '';
  }

  private selectedTeacher(): Teacher | undefined {
    return this.teacherOptions.find((item) => item.id === Number(this.selectedTeacherId));
  }
}
