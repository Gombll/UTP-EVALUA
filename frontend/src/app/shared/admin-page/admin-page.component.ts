import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

import { CrudService, QueryOptions } from '../../core/services/crud.service';
import { ActionDialogComponent } from '../dialogs/action-dialog.component';

export interface TableColumn {
  key: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  required?: boolean;
  options?: { value: string | number; label: string }[];
}

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.css'
})
export class AdminPageComponent<T extends { id: number }> implements OnInit {
  @Input({ required: true }) title = '';
  @Input({ required: true }) columns: TableColumn[] = [];
  @Input({ required: true }) fields: FormField[] = [];
  @Input({ required: true }) service!: CrudService<T>;
  @Input() canWrite = true;
  @Input() canCreate = true;
  @Input() canModify = true;
  @Input() fixedQuery: QueryOptions = {};

  rows: T[] = [];
  displayedColumns: string[] = [];
  editing: T | null = null;
  search = '';
  form: FormGroup = new FormGroup({});

  constructor(
    private readonly fb: FormBuilder,
    private readonly snack: MatSnackBar,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.displayedColumns = [
      ...this.columns.map((column) => column.key),
      ...(this.canModify ? ['actions'] : [])
    ];
    const group: Record<string, unknown[]> = {};
    this.fields.forEach((field) => {
      group[field.key] = ['', field.required ? Validators.required : []];
    });
    this.form = this.fb.group(group);
    this.load();
  }

  load(): void {
    this.service
      .list({ ...this.fixedQuery, search: this.search, per_page: 50 })
      .subscribe((page) => (this.rows = page.items));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.normalizePayload(this.form.getRawValue());
    const request = this.editing
      ? this.service.update(this.editing.id, payload as Partial<T>)
      : this.service.create(payload as Partial<T>);

    request.subscribe(() => {
      this.snack.open('Cambios guardados correctamente.', 'Cerrar', { duration: 2600 });
      this.reset();
      this.load();
    });
  }

  edit(row: T): void {
    this.editing = row;
    this.form.patchValue(row as Record<string, unknown>);
  }

  remove(row: T): void {
    this.dialog
      .open(ActionDialogComponent, {
        data: {
          title: 'Eliminar registro',
          message: 'Esta acción quitará el registro seleccionado de forma permanente.',
          icon: 'delete',
          tone: 'danger',
          confirmText: 'Eliminar',
          cancelText: 'Conservar'
        }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.service.delete(row.id).subscribe(() => {
          this.snack.open('Registro eliminado correctamente.', 'Cerrar', { duration: 2600 });
          this.load();
        });
      });
  }

  reset(): void {
    this.editing = null;
    this.form.reset();
  }

  rowValue(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key] ?? '';
  }

  private normalizePayload(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).map(([key, raw]) => [
        key,
        this.isNumericField(key) && raw !== '' ? Number(raw) : raw
      ])
    );
  }

  private isNumericField(key: string): boolean {
    return this.fields.some((field) => field.key === key && field.type === 'number');
  }
}
