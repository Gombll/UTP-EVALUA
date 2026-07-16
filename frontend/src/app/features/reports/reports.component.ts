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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

import { AuthService } from '../../core/services/auth.service';
import { RecommendationService, ReportService } from '../../core/services/domain.services';

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

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('chartHost') private chartHosts!: QueryList<ElementRef<HTMLDivElement>>;

  private readonly service = inject(ReportService);
  private readonly recommendationService = inject(RecommendationService);
  private readonly chartInstances = new Map<string, ECharts>();
  private viewReady = false;
  private readonly resizeHandler = () => this.resizeCharts();

  auth = inject(AuthService);
  excelUrl = this.service.excelUrl();
  csvUrl = this.service.csvUrl();
  adminData: AdminDataBlock[] = [];
  chartPanels: ChartPanel[] = [];
  kpis: DataEntry[] = [];

  teachers = [
    { name: 'Dr. Alejandro Ruiz', career: 'Ingenieria de Sistemas', rating: 4.9, reviews: 15 },
    { name: 'Msc. Laura Torres', career: 'Ingenieria de Software', rating: 4.8, reviews: 10 },
    { name: 'Ing. Pedro Gomez', career: 'Marketing', rating: 4.6, reviews: 15 },
    { name: 'Dra. Sofia Morales', career: 'Ingenieria Industrial', rating: 4.5, reviews: 5 }
  ];
  careers = [
    { name: 'Ingenieria de Sistemas', faculty: 'Ingenieria', rating: 4.9, reviews: 15 },
    { name: 'Ingenieria de Software', faculty: 'Ingenieria', rating: 4.8, reviews: 10 },
    { name: 'Marketing', faculty: 'Gestion y Negocios', rating: 4.6, reviews: 5 },
    { name: 'Ingenieria Industrial', faculty: 'Ingenieria', rating: 4.5, reviews: 3 }
  ];
  criteria = [
    'Claridad y dominio del tema',
    'Utilidad del material de apoyo',
    'Actividades practicas',
    'Organizacion y logistica',
    'Logro de objetivos'
  ];

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      return;
    }

    this.service.chartData().subscribe({
      next: (data) => this.loadChartData(data),
      error: () => undefined
    });
    this.recommendationService.recommendations().subscribe({
      next: (data) => this.appendAdminPayload('Recomendaciones AI', data),
      error: () => undefined
    });
    this.service.analytics().subscribe({
      next: (data) => this.appendAdminPayload('Analytics General', data),
      error: () => undefined
    });
    this.service.prolog().subscribe({
      next: (data) => this.appendAdminPayload('Prolog Engine (Inferencia)', data),
      error: () => undefined
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
    const teachers = this.records(data['ranking_docentes']);
    const careers = this.records(data['promedio_carreras']);
    const faculties = this.records(data['promedio_facultades']);
    const ratings = this.records(data['distribucion_calificaciones']);
    const statuses = this.records(data['estado_resenas']);
    const monthly = this.records(data['resenas_por_mes']);
    const teacherCoverage = this.records(data['cobertura_docentes']);
    const careerCoverage = this.records(data['cobertura_carreras']);

    return [
      {
        id: 'ranking-docentes',
        title: 'Ranking completo de docentes',
        subtitle: 'Incluye docentes con 0 resenas visibles para no ocultar vacios de datos.',
        type: 'Barras',
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
        subtitle: 'Todas las carreras registradas, incluso sin resenas.',
        type: 'Barras',
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
        subtitle: 'Resumen agregado con cobertura de resenas visibles.',
        type: 'Barras',
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
        title: 'Evolucion mensual por estado',
        subtitle: 'Ultimos 6 meses, rellenando meses sin actividad con cero.',
        type: 'Lineas',
        option: this.monthlyOption(monthly)
      },
      {
        id: 'distribucion-notas',
        title: 'Distribucion de calificaciones',
        subtitle: 'Notas visibles de 1 a 5, incluyendo categorias sin registros.',
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
        title: 'Estado de resenas',
        subtitle: 'Control de moderacion: visibles, reportadas y ocultas.',
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
        title: 'Cobertura de evaluations',
        subtitle: 'Detecta docentes y carreras sin resenas visibles.',
        type: 'Barras agrupadas',
        option: this.coverageOption(teacherCoverage, careerCoverage)
      }
    ];
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
          return `<strong>${labels[index]}</strong><br>${metric}: ${values[index].toFixed(2)}/5<br>Resenas visibles: ${reviewCounts[index]}`;
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
          name: 'Con resenas',
          type: 'bar',
          data: [
            this.coverageValue(teacherCoverage, 'Con resenas'),
            this.coverageValue(careerCoverage, 'Con resenas')
          ],
          barWidth: 28,
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          label: { show: true, position: 'top', fontWeight: 700 }
        },
        {
          name: 'Sin resenas',
          type: 'bar',
          data: [
            this.coverageValue(teacherCoverage, 'Sin resenas'),
            this.coverageValue(careerCoverage, 'Sin resenas')
          ],
          barWidth: 28,
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          label: { show: true, position: 'top', fontWeight: 700 }
        }
      ]
    };
  }

  private coverageValue(rows: MetricRecord[], label: string): number {
    return this.numberValue(rows.find((item) => this.label(item) === label)?.['cantidad']);
  }

  private appendAdminPayload(title: string, data: Record<string, unknown>): void {
    this.adminData.push({ title, data });
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
}
