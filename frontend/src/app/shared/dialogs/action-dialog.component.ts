import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface ActionDialogData {
  title: string;
  message: string;
  icon?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger';
  inputLabel?: string;
  inputPlaceholder?: string;
  inputRequired?: boolean;
}

@Component({
  selector: 'app-action-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ],
  template: `
    <section class="dialog-shell" [class.danger]="data.tone === 'danger'">
      <div class="dialog-icon">
        <mat-icon>{{ data.icon ?? 'info' }}</mat-icon>
      </div>

      <div class="dialog-copy">
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <mat-dialog-content>
          <p>{{ data.message }}</p>

          @if (data.inputLabel) {
            <mat-form-field appearance="outline">
              <mat-label>{{ data.inputLabel }}</mat-label>
              <textarea
                matInput
                rows="4"
                [(ngModel)]="value"
                [placeholder]="data.inputPlaceholder ?? ''"
              ></textarea>
            </mat-form-field>
          }
        </mat-dialog-content>
      </div>
    </section>

    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">
        {{ data.cancelText ?? 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        [color]="data.tone === 'danger' ? 'warn' : 'primary'"
        type="button"
        [disabled]="data.inputRequired && !value.trim()"
        (click)="confirm()"
      >
        {{ data.confirmText ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './action-dialog.component.css'
})
export class ActionDialogComponent {
  value = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ActionDialogData,
    private readonly dialogRef: MatDialogRef<ActionDialogComponent, string | boolean>
  ) {}

  confirm(): void {
    this.dialogRef.close(this.data.inputLabel ? this.value.trim() : true);
  }
}
