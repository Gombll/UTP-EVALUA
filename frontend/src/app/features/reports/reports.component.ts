import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

import { Teacher } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import {
  DashboardService,
  RecommendationService,
  ReportService,
  TeacherService
} from '../../core/services/domain.services';

interface AdminDataBlock {
  title: string;
  data: Record<string, unknown>;
}

interface DataEntry {
  key: string;
  value: unknown;
}

interface ChartPanel {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  option: EChartsOption;
  limitKey?: string;
  limitValue?: number;
}

interface MetricRecord {
  nombre?: string;
  label?: string;
  facultad?: string;
  carrera?: string;
  promedio?: number;
  resenas?: number;
  cantidad?: number;
  calificacion?: number;
  estado?: string;
  mes?: string;
  visible?: number;
  reportada?: number;
  oculta?: number;
  total?: number;
}

type ChartDataPayload = Record<string, unknown>;

interface RankingTeacher {
  name: string;
  career: string;
  rating: number;
  reviews: number;
}

interface RankingCareer {
  name: string;
  faculty: string;
  rating: number;
  reviews: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatIconModule, MatSnackBarModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('chartHost') private chartHosts!: QueryList<ElementRef<HTMLDivElement>>;

  private readonly service = inject(ReportService);
  private readonly recommendationService = inject(RecommendationService);
  private readonly dashboardService = inject(DashboardService);
  private readonly teacherService = inject(TeacherService);
  private readonly snack = inject(MatSnackBar);
  private readonly chartInstances = new Map<string, ECharts>();
  private viewReady = false;
  private readonly resizeHandler = () => this.resizeCharts();

  auth = inject(AuthService);
  exportExcel(): void {
    this.service.downloadExcel().subscribe({
      next: (blob) => this.downloadBlob(blob, 'ranking_docentes.xlsx'),
      error: () => this.snack.open('No se pudo exportar el archivo Excel.', 'Cerrar', { duration: 3200 })
    });
  }

  exportCsv(): void {
    this.service.downloadCsv().subscribe({
      next: (blob) => this.downloadBlob(blob, 'ranking_docentes.csv'),
      error: () => this.snack.open('No se pudo exportar el archivo CSV.', 'Cerrar', { duration: 3200 })
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  adminData: AdminDataBlock[] = [];
  chartPanels: ChartPanel[] = [];
  kpis: DataEntry[] = [];
  reportWarnings: string[] = [];
  rawChartData: ChartDataPayload | null = null;
  chartLimitOptions = [5, 10, 20, 50, 100];
  chartLimits: Record<string, number> = {
    'ranking-docentes': 10,
    'promedio-carreras': 10,
    'promedio-facultades': 10
  };

  teachers: RankingTeacher[] = [];
  careers: RankingCareer[] = [];

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.loadAdminReports();
    } else {
      this.loadStudentReports();
    }
  }

  onChartLimitChange(): void {
    if (!this.rawChartData) {
      return;
    }
    this.chartPanels = this.buildChartPanels(this.rawChartData);
    queueMicrotask(() => this.renderCharts());
  }

  chartLimit(limitKey: string | undefined): number {
    return limitKey ? this.chartLimits[limitKey] ?? 10 : 10;
  }

  setChartLimit(limitKey: string | undefined, value: number): void {
    if (!limitKey) {
      return;
    }
    this.chartLimits[limitKey] = Number(value);
    this.onChartLimitChange();
  }

  private loadAdminReports(): void {
    this.service.chartData().subscribe({
      next: (data) => this.loadChartData(data),
      error: () => this.addReportWarning('No se pudieron cargar los datos de gráficos.')
    });
    this.recommendationService.recommendations().subscribe({
      next: (data) => this.appendAdminPayload('Recomendaciones AI', data),
      error: () => this.addReportWarning('No se pudieron cargar las recomendaciones.')
    });
    this.service.analytics().subscribe({
      next: (data) => this.appendAdminPayload('Analytics General', data),
      error: () => this.addReportWarning('No se pudieron cargar las métricas de analytics.')
    });
    this.service.prolog().subscribe({
      next: (data) => this.appendAdminPayload('Prolog Engine (Inferencia)', data),
      error: () => this.addReportWarning('No se pudieron cargar las inferencias Prolog.')
    });
  }

  private loadStudentReports(): void {
    this.teacherService.list({ per_page: 100 }).subscribe({
      next: (teachersPage) => {
        const teachers = teachersPage.items;
        this.updateStudentRankings(teachers);
        this.chartPanels = this.buildStudentChartPanels(teachers);
        queueMicrotask(() => this.renderCharts());
      },
      error: () => this.addReportWarning('No se pudieron cargar los rankings para estudiantes.')
    });

    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        const top = summary.top_docentes ?? [];
        if (top.length > 0) {
          this.updateStudentRankings(top);
        }
      },
      error: () => this.addReportWarning('No se pudo cargar el resumen principal.')
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.chartHosts.changes.subscribe(() => this.renderCharts());
    window.addEventListener('resize', this.resizeHandler);
    this.renderCharts();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.chartInstances.forEach((chart) => chart.dispose());
    this.chartInstances.clear();
  }

  private loadChartData(data: ChartDataPayload): void {
    this.rawChartData = data;
    this.kpis = this.objectEntries(data['kpis']);
    this.chartPanels = this.buildChartPanels(data);
    this.updateVisibleRankings(data);
    queueMicrotask(() => this.renderCharts());
  }

  private updateVisibleRankings(data: ChartDataPayload): void {
    const teachers = this.records(data['ranking_docentes']);
    const careers = this.records(data['promedio_carreras']);

    if (teachers.length > 0) {
      this.teachers = teachers.slice(0, 4).map((teacher) => ({
        name: this.name(teacher),
        career: this.displayValue(teacher['carrera']),
        rating: this.numberValue(teacher['promedio']),
        reviews: this.numberValue(teacher['resenas'])
      }));
    }

    if (careers.length > 0) {
      this.careers = careers.slice(0, 4).map((career) => ({
        name: this.name(career),
        faculty: this.displayValue(career['facultad']),
        rating: this.numberValue(career['promedio']),
        reviews: this.numberValue(career['resenas'])
      }));
    }
  }

  private buildChartPanels(data: ChartDataPayload): ChartPanel[] {
    const teachers = this.limitedRecords(data['ranking_docentes'], 'ranking-docentes');
    const careers = this.limitedRecords(data['promedio_carreras'], 'promedio-carreras');
    const faculties = this.limitedRecords(data['promedio_facultades'], 'promedio-facultades');
    const ratings = this.records(data['distribucion_calificaciones']);
    const statuses = this.records(data['estado_resenas']);
    const monthly = this.records(data['resenas_por_mes']);
    const teacherCoverage = this.records(data['cobertura_docentes']);
    const careerCoverage = this.records(data['cobertura_carreras']);

    return [
      {
        id: 'ranking-docentes',
        title: 'Ranking completo de docentes',
        subtitle: 'Incluye docentes con 0 reseñas visibles para no ocultar vacíos de datos.',
        type: 'Barras',
        limitKey: 'ranking-docentes',
        limitValue: this.chartLimits['ranking-docentes'],
        option: this.horizontalBarOption(
          teachers.map((item) => this.name(item)),
          teachers.map((item) => this.numberValue(item['promedio'])),
          teachers.map((item) => this.numberValue(item['resenas'])),
          '#c9003f',
          'Promedio'
        )
      },
      {
        id: 'promedio-carreras',
        title: 'Promedio por carrera',
        subtitle: 'Todas las carreras registradas, incluso sin reseñas.',
        type: 'Barras',
        limitKey: 'promedio-carreras',
        limitValue: this.chartLimits['promedio-carreras'],
        option: this.horizontalBarOption(
          careers.map((item) => this.name(item)),
          careers.map((item) => this.numberValue(item['promedio'])),
          careers.map((item) => this.numberValue(item['resenas'])),
          '#0f6b7a',
          'Promedio'
        )
      },
      {
        id: 'promedio-facultades',
        title: 'Promedio por facultad',
        subtitle: 'Resumen agregado con cobertura de reseñas visibles.',
        type: 'Barras',
        limitKey: 'promedio-facultades',
        limitValue: this.chartLimits['promedio-facultades'],
        option: this.horizontalBarOption(
          faculties.map((item) => this.name(item)),
          faculties.map((item) => this.numberValue(item['promedio'])),
          faculties.map((item) => this.numberValue(item['resenas'])),
          '#15754d',
          'Promedio'
        )
      },
      {
        id: 'resenas-mes',
        title: 'Evolución mensual por estado',
        subtitle: 'Últimos 6 meses, rellenando meses sin actividad con cero.',
        type: 'Líneas',
        option: this.monthlyOption(monthly)
      },
      {
        id: 'distribucion-notas',
        title: 'Distribución de calificaciones',
        subtitle: 'Notas visibles de 1 a 5, incluyendo categorías sin registros.',
        type: 'Donut',
        option: this.donutOption(
          ratings.map((item) => ({
            name: `${this.numberValue(item['calificacion'])}/5`,
            value: this.numberValue(item['cantidad'])
          })),
          ['#8f002d', '#c9003f', '#f4a51c', '#15754d', '#0f6b7a']
        )
      },
      {
        id: 'estado-resenas',
        title: 'Estado de reseñas',
        subtitle: 'Control de moderación: visibles, reportadas y ocultas.',
        type: 'Donut',
        option: this.donutOption(
          statuses.map((item) => ({
            name: this.label(item),
            value: this.numberValue(item['cantidad'])
          })),
          ['#15754d', '#f4a51c', '#c9003f']
        )
      },
      {
        id: 'cobertura',
        title: 'Cobertura de reseñas',
        subtitle: 'Detecta docentes y carreras sin reseñas visibles.',
        type: 'Barras agrupadas',
        option: this.coverageOption(teacherCoverage, careerCoverage)
      }
    ];
  }

  private buildStudentChartPanels(teachers: Teacher[]): ChartPanel[] {
    const rankedTeachers = teachers
      .map((teacher) => ({
        nombre: `${teacher.nombres} ${teacher.apellidos}`,
        promedio: teacher.promedio ?? 0,
        resenas: teacher.resenas ?? 0
      }))
      .sort((a, b) => b.promedio - a.promedio || b.resenas - a.resenas)
      .slice(0, 8);

    const careerMap = new Map<string, { nombre: string; total: number; resenas: number }>();
    teachers.forEach((teacher) => {
      const career = teacher.carrera ?? 'Sin carrera';
      const current = careerMap.get(career) ?? { nombre: career, total: 0, resenas: 0 };
      const reviews = teacher.resenas ?? 0;
      current.total += (teacher.promedio ?? 0) * reviews;
      current.resenas += reviews;
      careerMap.set(career, current);
    });

    const careers = Array.from(careerMap.values())
      .map((career) => ({
        nombre: career.nombre,
        promedio: career.resenas ? Number((career.total / career.resenas).toFixed(2)) : 0,
        resenas: career.resenas
      }))
      .sort((a, b) => b.promedio - a.promedio || b.resenas - a.resenas)
      .slice(0, 6);

    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      name: `${rating}/5`,
      value: teachers.filter((teacher) => Math.round(teacher.promedio ?? 0) === rating).length
    }));

    return [
      {
        id: 'student-docentes',
        title: 'Docentes mejor evaluados',
        subtitle: 'Vista resumida para orientar tu evaluación.',
        type: 'Barras',
        option: this.horizontalBarOption(
          rankedTeachers.map((item) => item.nombre),
          rankedTeachers.map((item) => item.promedio),
          rankedTeachers.map((item) => item.resenas),
          '#c9003f',
          'Promedio'
        )
      },
      {
        id: 'student-carreras',
        title: 'Promedio por carrera',
        subtitle: 'Resumen general sin datos técnicos de administración.',
        type: 'Barras',
        option: this.horizontalBarOption(
          careers.map((item) => item.nombre),
          careers.map((item) => item.promedio),
          careers.map((item) => item.resenas),
          '#0f6b7a',
          'Promedio'
        )
      },
      {
        id: 'student-distribucion',
        title: 'Distribución general',
        subtitle: 'Agrupación simple de promedios docentes.',
        type: 'Donut',
        option: this.donutOption(distribution, ['#8f002d', '#c9003f', '#f4a51c', '#15754d', '#0f6b7a'])
      }
    ];
  }

  private updateStudentRankings(teachers: Teacher[]): void {
    const ranked = teachers
      .map((teacher) => ({
        name: `${teacher.nombres} ${teacher.apellidos}`,
        career: teacher.carrera ?? teacher.facultad ?? 'Sin carrera asignada',
        rating: Number((teacher.promedio ?? 0).toFixed(1)),
        reviews: teacher.resenas ?? 0
      }))
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);

    this.teachers = ranked.slice(0, 4);

    const careerMap = new Map<string, { name: string; faculty: string; total: number; reviews: number }>();
    teachers.forEach((teacher) => {
      const name = teacher.carrera ?? 'Sin carrera';
      const current =
        careerMap.get(name) ?? {
          name,
          faculty: teacher.facultad ?? 'Sin facultad',
          total: 0,
          reviews: 0
        };
      const reviews = teacher.resenas ?? 0;
      current.total += (teacher.promedio ?? 0) * reviews;
      current.reviews += reviews;
      careerMap.set(name, current);
    });

    this.careers = Array.from(careerMap.values())
      .map((career) => ({
        name: career.name,
        faculty: career.faculty,
        rating: career.reviews ? Number((career.total / career.reviews).toFixed(1)) : 0,
        reviews: career.reviews
      }))
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
      .slice(0, 4);
  }

  private renderCharts(): void {
    if (!this.viewReady || !this.chartHosts?.length || !this.chartPanels.length) {
      return;
    }

    const activeIds = new Set(this.chartPanels.map((panel) => panel.id));
    this.chartInstances.forEach((chart, id) => {
      if (!activeIds.has(id)) {
        chart.dispose();
        this.chartInstances.delete(id);
      }
    });

    this.chartHosts.forEach((host, index) => {
      const panel = this.chartPanels[index];
      if (!panel) {
        return;
      }
      const element = host.nativeElement;
      const chart = this.chartInstances.get(panel.id) ?? echarts.init(element);
      chart.setOption(panel.option, true);
      chart.resize();
      this.chartInstances.set(panel.id, chart);
    });
  }

  private resizeCharts(): void {
    this.chartInstances.forEach((chart) => chart.resize());
  }

  private horizontalBarOption(
    labels: string[],
    values: number[],
    reviewCounts: number[],
    color: string,
    metric: string
  ): EChartsOption {
    return {
      color: [color],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const index = Number(item.dataIndex ?? 0);
          return `<strong>${labels[index]}</strong><br>${metric}: ${values[index].toFixed(2)}/5<br>Reseñas visibles: ${reviewCounts[index]}`;
        }
      },
      grid: { left: 170, right: 42, top: 24, bottom: 42 },
      xAxis: {
        type: 'value',
        max: 5,
        splitLine: { lineStyle: { color: '#dfe3e7' } },
        axisLabel: { color: '#69707a' }
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#202126', width: 150, overflow: 'break' }
      },
      series: [
        {
          name: metric,
          type: 'bar',
          data: values,
          barWidth: 18,
          itemStyle: { borderRadius: [0, 8, 8, 0] },
          label: {
            show: true,
            position: 'right',
            formatter: ({ value }) => `${Number(value).toFixed(2)}/5`,
            color: '#202126',
            fontWeight: 700
          }
        }
      ]
    };
  }

  private monthlyOption(rows: MetricRecord[]): EChartsOption {
    const months = rows.map((item) => this.displayValue(item['mes']));
    return {
      color: ['#15754d', '#f4a51c', '#c9003f'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { color: '#69707a' } },
      grid: { left: 44, right: 24, top: 50, bottom: 44 },
      xAxis: { type: 'category', data: months, axisLabel: { color: '#69707a' } },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#dfe3e7' } },
        axisLabel: { color: '#69707a' }
      },
      series: [
        this.lineSeries('Visibles', rows.map((item) => this.numberValue(item['visible']))),
        this.lineSeries('Reportadas', rows.map((item) => this.numberValue(item['reportada']))),
        this.lineSeries('Ocultas', rows.map((item) => this.numberValue(item['oculta'])))
      ]
    };
  }

  private lineSeries(name: string, data: number[]) {
    return {
      name,
      type: 'line' as const,
      smooth: true,
      data,
      symbolSize: 8,
      lineStyle: { width: 3 },
      areaStyle: { opacity: 0.08 }
    };
  }

  private donutOption(data: Array<{ name: string; value: number }>, colors: string[]): EChartsOption {
    return {
      color: colors,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#69707a' } },
      series: [
        {
          type: 'pie',
          radius: ['46%', '72%'],
          center: ['50%', '43%'],
          data,
          minAngle: 6,
          avoidLabelOverlap: true,
          itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
          label: { formatter: '{b}\n{c}', color: '#202126', fontWeight: 700 }
        }
      ]
    };
  }

  private coverageOption(teacherCoverage: MetricRecord[], careerCoverage: MetricRecord[]): EChartsOption {
    return {
      color: ['#15754d', '#c9003f'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { color: '#69707a' } },
      grid: { left: 54, right: 24, top: 52, bottom: 38 },
      xAxis: { type: 'category', data: ['Docentes', 'Carreras'], axisLabel: { color: '#69707a' } },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#dfe3e7' } },
        axisLabel: { color: '#69707a' }
      },
      series: [
        {
          name: 'Con reseñas',
          type: 'bar',
          data: [
            this.coverageValue(teacherCoverage, 'Con reseñas'),
            this.coverageValue(careerCoverage, 'Con reseñas')
          ],
          barWidth: 28,
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          label: { show: true, position: 'top', fontWeight: 700 }
        },
        {
          name: 'Sin reseñas',
          type: 'bar',
          data: [
            this.coverageValue(teacherCoverage, 'Sin reseñas'),
            this.coverageValue(careerCoverage, 'Sin reseñas')
          ],
          barWidth: 28,
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          label: { show: true, position: 'top', fontWeight: 700 }
        }
      ]
    };
  }

  private coverageValue(rows: MetricRecord[], label: string): number {
    const expected = this.normalizeLabel(label);
    return this.numberValue(
      rows.find((item) => this.normalizeLabel(this.label(item)) === expected)?.['cantidad']
    );
  }

  private appendAdminPayload(title: string, data: Record<string, unknown>): void {
    this.adminData.push({ title, data });
  }

  private addReportWarning(message: string): void {
    if (!this.reportWarnings.includes(message)) {
      this.reportWarnings.push(message);
    }
  }

  isArray(val: unknown): boolean {
    return Array.isArray(val);
  }

  isObject(val: unknown): boolean {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  objectEntries(value: unknown): DataEntry[] {
    if (!this.isObject(value)) {
      return [];
    }
    return Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => ({
      key,
      value: entryValue
    }));
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'Sin datos';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return JSON.stringify(value);
  }

  isTeacherRecord(item: unknown): boolean {
    if (!this.isObject(item)) return false;
    const rec = item as Record<string, unknown>;
    return Boolean(rec['docente'] || rec['nombre'] || rec['facultad'] || rec['promedio'] !== undefined);
  }

  getTeacherName(item: unknown): string {
    if (!this.isObject(item)) return String(item);
    const rec = item as Record<string, unknown>;
    return String(rec['docente'] ?? rec['nombre'] ?? 'Docente');
  }

  getTeacherSubtitle(item: unknown): string {
    if (!this.isObject(item)) return '';
    const rec = item as Record<string, unknown>;
    const fac = rec['facultad'] ? String(rec['facultad']) : '';
    const car = rec['carrera'] ? String(rec['carrera']) : '';
    if (fac && car) return `${fac} | ${car}`;
    return fac || car || '';
  }

  getTeacherScore(item: unknown): string | null {
    if (!this.isObject(item)) return null;
    const rec = item as Record<string, unknown>;
    if (rec['promedio'] !== undefined) {
      return `${Number(rec['promedio']).toFixed(1)}/5`;
    }
    return null;
  }

  isPrimitiveArray(arr: unknown[]): boolean {
    return arr.every((el) => typeof el === 'string' || typeof el === 'number' || typeof el === 'boolean');
  }

  isComplexDict(value: unknown): boolean {
    if (!this.isObject(value)) return false;
    const entries = Object.values(value as Record<string, unknown>);
    return entries.some((v) => Array.isArray(v) || this.isObject(v));
  }

  private records(value: unknown): MetricRecord[] {
    return Array.isArray(value)
      ? value.filter((item): item is MetricRecord => this.isObject(item))
      : [];
  }

  private limitedRecords(value: unknown, limitKey: string): MetricRecord[] {
    const limit = this.chartLimits[limitKey] ?? 10;
    return this.records(value).slice(0, limit);
  }

  private numberValue(value: unknown): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private name(item: MetricRecord): string {
    return this.displayValue(item['nombre'] ?? item['label'] ?? item['estado']);
  }

  private label(item: MetricRecord): string {
    return this.displayValue(item['label'] ?? item['estado']);
  }

  private normalizeLabel(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
