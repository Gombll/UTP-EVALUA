import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { Career, Dashboard, Faculty, Review, Teacher } from '../../core/models';
import {
  CareerService,
  DashboardService,
  FacultyService,
  ReviewService,
  TeacherService
} from '../../core/services/domain.services';
import { ActionDialogComponent } from '../../shared/dialogs/action-dialog.component';

interface CareerSummary {
  id: number;
  name: string;
  faculty: string;
  facultyId?: number;
  reviews: number;
  rating: number;
}

interface TeacherSummary {
  id: number;
  name: string;
  area: string;
  facultyId?: number;
  careerId?: number;
  reviews: number;
  rating: number;
}

interface ReviewSummary {
  id: number;
  author: string;
  date: string;
  rating: number;
  meta: string;
  text: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly facultyService = inject(FacultyService);
  private readonly careerService = inject(CareerService);
  private readonly teacherService = inject(TeacherService);
  private readonly reviewService = inject(ReviewService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  data?: Dashboard;
  faculties: Faculty[] = [];
  careers: Career[] = [];
  teachers: Teacher[] = [];
  successMessage = '';
  selectedFacultyId: number | '' = '';
  selectedCareerId: number | '' = '';
  searchTerm = '';

  ngOnInit(): void {
    this.readNavigationAlert();
    this.loadData();
  }

  get filteredCareers(): Career[] {
    if (!this.selectedFacultyId) {
      return this.careers;
    }
    return this.careers.filter((career) => career.facultad_id === Number(this.selectedFacultyId));
  }

  get careerSummaries(): CareerSummary[] {
    const careerMap = new Map<number, CareerSummary>();

    this.filteredTeachers().forEach((teacher) => {
      const careerId = teacher.carrera_id;
      const current = careerMap.get(careerId) ?? {
        id: careerId,
        name: teacher.carrera ?? 'Carrera sin nombre',
        faculty: teacher.facultad ?? 'Sin facultad',
        facultyId: teacher.facultad_id,
        reviews: 0,
        rating: 0
      };
      const reviews = teacher.resenas ?? 0;
      const weightedRating = current.rating * current.reviews + (teacher.promedio ?? 0) * reviews;
      current.reviews += reviews;
      current.rating = current.reviews ? Number((weightedRating / current.reviews).toFixed(1)) : 0;
      careerMap.set(careerId, current);
    });

    return Array.from(careerMap.values())
      .filter((career) => career.reviews > 0)
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
      .slice(0, 5);
  }

  get teacherSummaries(): TeacherSummary[] {
    const source = this.data?.top_docentes?.length ? this.data.top_docentes : this.teachers;
    return this.filteredTeachers(source)
      .filter((teacher) => (teacher.resenas ?? 0) > 0)
      .map((teacher) => ({
        id: teacher.id,
        name: `${teacher.nombres} ${teacher.apellidos}`,
        area: teacher.carrera ?? teacher.facultad ?? 'Sin carrera asignada',
        facultyId: teacher.facultad_id,
        careerId: teacher.carrera_id,
        reviews: teacher.resenas ?? 0,
        rating: Number((teacher.promedio ?? 0).toFixed(1))
      }))
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
      .slice(0, 5);
  }

  get latestReviews(): ReviewSummary[] {
    return (this.data?.ultimas_resenas ?? [])
      .filter((review) => this.matchesReviewSearch(review))
      .slice(0, 5)
      .map((review) => {
        const teacher = this.teachers.find((item) => item.id === review.docente_id);
        return {
          id: review.id,
          author: 'Estudiante anónimo',
          date: this.formatDate(review.fecha),
          rating: review.calificacion,
          meta: `Carrera: ${teacher?.carrera ?? 'Sin carrera'} / Docente: ${review.docente ?? 'Sin docente'}`,
          text: review.comentario
        };
      });
  }

  get topTeacher(): TeacherSummary | undefined {
    return this.teacherSummaries[0];
  }

  get topCareer(): CareerSummary | undefined {
    return this.careerSummaries[0];
  }

  applyFilters(): void {
    if (
      this.selectedCareerId &&
      !this.filteredCareers.some((item) => item.id === Number(this.selectedCareerId))
    ) {
      this.selectedCareerId = '';
    }
  }

  dismissSuccess(): void {
    this.successMessage = '';
  }

  reportReview(review: ReviewSummary): void {
    this.dialog
      .open(ActionDialogComponent, {
        data: {
          title: 'Reportar reseña',
          message: 'Indica brevemente por qué esta reseña debe ser revisada por administración.',
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
            this.snack.open('Reseña enviada a moderación.', 'Cerrar', { duration: 2800 });
            this.loadData();
          },
          error: (error) => {
            const message = error?.error?.message ?? 'No se pudo reportar la reseña.';
            this.snack.open(message, 'Cerrar', { duration: 3200 });
          }
        });
      });
  }

  private loadData(): void {
    forkJoin({
      dashboard: this.dashboardService.getSummary(),
      faculties: this.facultyService.list({ per_page: 100 }),
      careers: this.careerService.list({ per_page: 100 }),
      teachers: this.teacherService.list({ per_page: 100 })
    }).subscribe(({ dashboard, faculties, careers, teachers }) => {
      this.data = dashboard;
      this.faculties = faculties.items;
      this.careers = careers.items;
      this.teachers = teachers.items;
    });
  }

  private filteredTeachers(source: Teacher[] = this.teachers): Teacher[] {
    const search = this.normalize(this.searchTerm);
    return source.filter((teacher) => {
      const matchesFaculty =
        !this.selectedFacultyId || teacher.facultad_id === Number(this.selectedFacultyId);
      const matchesCareer =
        !this.selectedCareerId || teacher.carrera_id === Number(this.selectedCareerId);
      const haystack = this.normalize(
        `${teacher.nombres} ${teacher.apellidos} ${teacher.carrera ?? ''} ${teacher.facultad ?? ''}`
      );
      return matchesFaculty && matchesCareer && (!search || haystack.includes(search));
    });
  }

  private matchesReviewSearch(review: Review): boolean {
    const search = this.normalize(this.searchTerm);
    if (!search) {
      return true;
    }
    const teacher = this.teachers.find((item) => item.id === review.docente_id);
    const haystack = this.normalize(
      `${review.docente ?? ''} ${teacher?.carrera ?? ''} ${review.comentario}`
    );
    return haystack.includes(search);
  }

  private readNavigationAlert(): void {
    const state = this.router.getCurrentNavigation()?.extras.state ?? window.history.state;
    if (state?.['reviewSuccess']) {
      this.successMessage = state['message'] ?? 'Tu evaluación fue registrada correctamente.';
      window.history.replaceState({}, document.title);
    }
  }

  private formatDate(value?: string): string {
    if (!value) {
      return 'Fecha no disponible';
    }
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(value));
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
