import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Review } from '../../core/models';
import { ReviewService } from '../../core/services/domain.services';
import { ActionDialogComponent } from '../../shared/dialogs/action-dialog.component';

type ModerationStatus = 'todos' | 'reportada' | 'visible' | 'oculta';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCardModule, MatIconModule, MatSnackBarModule],
  templateUrl: './moderation.component.html',
  styleUrl: './moderation.component.css'
})
export class ModerationComponent implements OnInit {
  private readonly reviews = inject(ReviewService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  rows: Review[] = [];
  status: ModerationStatus = 'reportada';
  search = '';
  loading = false;

  ngOnInit(): void {
    this.load();
  }

  get filteredRows(): Review[] {
    const term = this.normalize(this.search);
    if (!term) {
      return this.rows;
    }
    return this.rows.filter((review) =>
      this.normalize(`${review.docente ?? ''} ${review.estudiante ?? ''} ${review.comentario}`)
        .includes(term)
    );
  }

  load(): void {
    this.loading = true;
    this.reviews
      .list({
        per_page: 100,
        sort: this.status === 'reportada' ? 'fecha_reporte' : 'fecha',
        order: 'desc',
        estado: this.status === 'todos' ? undefined : this.status
      })
      .subscribe({
        next: (page) => {
          this.rows = page.items;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('No se pudieron cargar las reseñas.', 'Cerrar', { duration: 3000 });
        }
      });
  }

  approve(review: Review): void {
    this.reviews.moderate(review.id, 'aprobar').subscribe({
      next: () => {
        this.snack.open('Reseña aprobada y publicada.', 'Cerrar', { duration: 2600 });
        this.load();
      },
      error: (error) => {
        const message = error?.error?.message ?? 'No se pudo aprobar la reseña.';
        this.snack.open(message, 'Cerrar', { duration: 3400 });
      }
    });
  }

  hide(review: Review): void {
    this.dialog
      .open(ActionDialogComponent, {
        data: {
          title: 'Ocultar reseña',
          message: 'La reseña dejará de mostrarse en indicadores públicos. Registra el criterio aplicado.',
          icon: 'visibility_off',
          tone: 'danger',
          inputLabel: 'Motivo de moderación',
          inputPlaceholder: 'Ejemplo: lenguaje ofensivo, spam o contenido no verificable.',
          inputRequired: true,
          confirmText: 'Ocultar reseña',
          cancelText: 'Cancelar'
        }
      })
      .afterClosed()
      .subscribe((motivo) => {
        if (!motivo) {
          return;
        }
        this.reviews.moderate(review.id, 'ocultar', String(motivo)).subscribe({
          next: () => {
            this.snack.open('Reseña ocultada correctamente.', 'Cerrar', { duration: 2600 });
            this.load();
          },
          error: (error) => {
            const message = error?.error?.message ?? 'No se pudo ocultar la reseña.';
            this.snack.open(message, 'Cerrar', { duration: 3400 });
          }
        });
      });
  }

  statusLabel(review: Review): string {
    if (review.estado === 'reportada') {
      return 'Reportada';
    }
    if (review.estado === 'oculta') {
      return 'Oculta';
    }
    return 'Visible';
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Sin fecha';
    }
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
