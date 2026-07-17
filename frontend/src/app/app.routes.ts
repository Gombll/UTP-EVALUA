import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          )
      },
      {
        path: 'facultades',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/faculties/faculties.component').then(
            (m) => m.FacultiesComponent
          )
      },
      {
        path: 'carreras',
        loadComponent: () =>
          import('./features/careers/careers.component').then(
            (m) => m.CareersComponent
          )
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('./features/courses/courses.component').then(
            (m) => m.CoursesComponent
          )
      },
      {
        path: 'docentes',
        loadComponent: () =>
          import('./features/teachers/teachers.component').then(
            (m) => m.TeachersComponent
          )
      },
      {
        path: 'estudiantes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/students/students.component').then(
            (m) => m.StudentsComponent
          )
      },
      {
        path: 'moderacion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/moderation/moderation.component').then(
            (m) => m.ModerationComponent
          )
      },
      {
        path: 'resenas',
        loadComponent: () =>
          import('./features/reviews/reviews.component').then(
            (m) => m.ReviewsComponent
          )
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reports/reports.component').then(
            (m) => m.ReportsComponent
          )
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
