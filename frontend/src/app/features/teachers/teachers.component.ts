import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Career, Course, Faculty, Review, Teacher } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import {
  CareerService,
  CourseService,
  FacultyService,
  ReviewService,
  TeacherService
} from '../../core/services/domain.services';
import { AdminPageComponent, FormField, TableColumn } from '../../shared/admin-page/admin-page.component';
import { ActionDialogComponent } from '../../shared/dialogs/action-dialog.component';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
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
  private readonly coursesService = inject(CourseService);
  private readonly reviewService = inject(ReviewService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  teachers: Teacher[] = [];
  faculties: Faculty[] = [];
  careers: Career[] = [];
  courses: Course[] = [];
  selectedReviewTeacher: Teacher | null = null;
  teacherReviews: Review[] = [];
  reviewsLoading = false;
  reviewsError = '';
  reviewRatingFilter: number | '' = '';
  reviewSort: 'recent' | 'highest' | 'lowest' = 'recent';
  reportedReviewIds = new Set<number>();
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
    { key: 'curso', label: 'Curso' },
    { key: 'promedio', label: 'Promedio' }
  ];
  fields: FormField[] = [
    { key: 'nombres', label: 'Nombres', type: 'text', required: true },
    { key: 'apellidos', label: 'Apellidos', type: 'text', required: true },
    { key: 'correo', label: 'Correo', type: 'email', required: true },
    { key: 'facultad_id', label: 'Facultad', type: 'select', required: true, options: [] },
    { key: 'carrera_id', label: 'Carrera', type: 'select', required: true, options: [] },
    { key: 'curso_id', label: 'Curso asignado', type: 'select', options: [] },
    { key: 'fotografia', label: 'URL de fotografía', type: 'text' }
  ];

  ngOnInit(): void {
    forkJoin({
      faculties: this.facultiesService.list({ per_page: 100 }),
      careers: this.careersService.list({ per_page: 100 }),
      courses: this.coursesService.list({ per_page: 100 }),
      teachers: this.service.list({ per_page: 100 })
    }).subscribe(({ faculties, careers, courses, teachers }) => {
      this.faculties = faculties.items;
      this.careers = careers.items;
      this.courses = courses.items;
      this.teachers = teachers.items;
      this.fields[3].options = this.faculties.map((item) => ({ value: item.id, label: item.nombre }));
      this.fields[4].options = this.careers.map((item) => ({ value: item.id, label: item.nombre }));
      this.fields[5].options = this.courses.map((item) => ({ value: item.id, label: item.nombre }));
      this.openInitialReviews();
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
          `${teacher.nombres} ${teacher.apellidos} ${teacher.correo} ${teacher.facultad ?? ''} ${teacher.carrera ?? ''} ${teacher.curso ?? ''}`
        );
        return matchesFaculty && matchesCareer && (!search || haystack.includes(search));
      })
      .sort((a, b) => (b.promedio ?? 0) - (a.promedio ?? 0));
  }

  get visibleTeacherReviews(): Review[] {
    const filtered = this.teacherReviews.filter(
      (review) => !this.reviewRatingFilter || review.calificacion === Number(this.reviewRatingFilter)
    );

    return [...filtered].sort((a, b) => {
      if (this.reviewSort === 'highest') {
        return b.calificacion - a.calificacion;
      }
      if (this.reviewSort === 'lowest') {
        return a.calificacion - b.calificacion;
      }
      return new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime();
    });
  }

  get reviewAverage(): number {
    if (!this.teacherReviews.length) {
      return 0;
    }
    const total = this.teacherReviews.reduce((sum, review) => sum + review.calificacion, 0);
    return Number((total / this.teacherReviews.length).toFixed(1));
  }

  get reviewDistribution(): Array<{ rating: number; count: number; percent: number }> {
    return [5, 4, 3, 2, 1].map((rating) => {
      const count = this.teacherReviews.filter((review) => review.calificacion === rating).length;
      const percent = this.teacherReviews.length ? Math.round((count / this.teacherReviews.length) * 100) : 0;
      return { rating, count, percent };
    });
  }

  onFacultyChange(): void {
    if (
      this.selectedCareerId &&
      !this.filteredCareers.some((career) => career.id === Number(this.selectedCareerId))
    ) {
      this.selectedCareerId = '';
    }
  }

  showReviews(teacher: Teacher): void {
    this.selectedReviewTeacher = teacher;
    this.teacherReviews = [];
    this.reviewsLoading = true;
    this.reviewsError = '';
    this.reviewRatingFilter = '';
    this.reviewSort = 'recent';

    this.reviewService
      .list({
        docente_id: teacher.id,
        estado: 'visible',
        sort: 'fecha',
        order: 'desc',
        per_page: 50
      })
      .subscribe({
        next: (page) => {
          this.teacherReviews = page.items;
          this.reviewsLoading = false;
        },
        error: (error) => {
          this.teacherReviews = [];
          this.reviewsLoading = false;
          this.reviewsError = error?.error?.message ?? 'No se pudieron cargar las reseñas del docente.';
        }
      });
  }

  closeReviews(): void {
    this.selectedReviewTeacher = null;
    this.teacherReviews = [];
    this.reviewsLoading = false;
    this.reviewsError = '';
    this.reviewRatingFilter = '';
    this.reviewSort = 'recent';
  }

  reportReview(review: Review): void {
    this.dialog
      .open(ActionDialogComponent, {
        data: {
          title: 'Reportar reseña',
          message: 'Indica por qué esta reseña debe ser revisada por administración.',
          icon: 'flag',
          inputLabel: 'Motivo del reporte',
          inputPlaceholder: 'Ejemplo: lenguaje ofensivo, información falsa o contenido fuera de contexto.',
          confirmText: 'Enviar reporte',
          cancelText: 'Cancelar'
        }
      })
      .afterClosed()
      .subscribe((motivo) => {
        if (motivo === false) {
          return;
        }
        this.reviewService.report(review.id, motivo || '').subscribe({
          next: () => {
            this.reportedReviewIds.add(review.id);
            this.teacherReviews = this.teacherReviews.filter((item) => item.id !== review.id);
            this.snack.open('Reseña enviada a moderación.', 'Cerrar', { duration: 2800 });
          },
          error: (error) => {
            const message = error?.error?.message ?? 'No se pudo reportar la reseña.';
            this.snack.open(message, 'Cerrar', { duration: 3200 });
          }
        });
      });
  }

  reviewDate(value: string | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  cleanReviewText(comment: string): string {
    return comment.replace(/^\[Curso:\s*[^\]]+\]\s*/, '');
  }

  reviewCourse(review: Review): string {
    if (review.curso) {
      return review.curso;
    }
    const match = review.comentario.match(/^\[Curso:\s*([^\]]+)\]\s*/);
    return match?.[1] ?? '';
  }

  private openInitialReviews(): void {
    const teacherId = Number(this.route.snapshot.queryParamMap.get('resenasDocenteId'));
    if (!teacherId) {
      return;
    }

    const teacher = this.teachers.find((item) => item.id === teacherId);
    if (!teacher) {
      return;
    }

    this.selectedFacultyId = teacher.facultad_id;
    this.selectedCareerId = teacher.carrera_id;
    this.showReviews(teacher);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
