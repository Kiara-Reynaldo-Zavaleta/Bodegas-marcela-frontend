import {
  Component, inject, signal, computed, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Chart,
  CategoryScale, LinearScale,
  BarElement, BarController,
  PointElement, LineElement, LineController,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import { ApiService } from '../../services/api.service';
import { VentaPorDia, ProductoMasVendido, VentaPorHora } from '../../models/reporte.model';
import { Boleta } from '../../models/boleta.model';

Chart.register(
  CategoryScale, LinearScale,
  BarElement, BarController,
  PointElement, LineElement, LineController,
  Title, Tooltip, Legend, Filler
);

const ORDEN_DIAS = ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO'];
const ETIQUETAS_DIAS: Record<string, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIERCOLES: 'Mié',
  JUEVES: 'Jue', VIERNES: 'Vie', SABADO: 'Sáb', DOMINGO: 'Dom'
};

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  imports: [FormsModule, DatePipe, DecimalPipe]
})
export class Reportes implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);

  @ViewChild('canvasDia')       private canvasDia!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasProductos') private canvasProductos!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasHoras')     private canvasHoras!: ElementRef<HTMLCanvasElement>;

  private chartDia?: Chart;
  private chartProductos?: Chart;
  private chartHoras?: Chart;
  private viewReady = false;

  datosDia       = signal<VentaPorDia[]>([]);
  datosProductos = signal<ProductoMasVendido[]>([]);
  datosHoras     = signal<VentaPorHora[]>([]);

  cargandoDia       = signal(true);
  cargandoProductos = signal(true);
  cargandoHoras     = signal(true);

  dniSearch       = '';
  cargandoCliente = signal(false);
  boletasCliente  = signal<Boleta[]>([]);
  errorCliente    = signal('');
  dniConsultado   = signal('');
  boletaExpandida = signal<number | null>(null);
  totalCliente    = computed(() => this.boletasCliente().reduce((acc, b) => acc + b.total, 0));

  ngOnInit() {
    this.api.getVentasPorDia().subscribe({
      next: data => {
        const ordenado = [...data].sort(
          (a, b) => ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia)
        );
        this.datosDia.set(ordenado);
        this.cargandoDia.set(false);
        this.tryRender('dia');
      },
      error: () => this.cargandoDia.set(false)
    });

    this.api.getProductosMasVendidos().subscribe({
      next: data => {
        this.datosProductos.set(data.slice(0, 8));
        this.cargandoProductos.set(false);
        this.tryRender('productos');
      },
      error: () => this.cargandoProductos.set(false)
    });

    this.api.getVentasPorHora().subscribe({
      next: data => {
        const ordenado = [...data].sort((a, b) => a.hora - b.hora);
        this.datosHoras.set(ordenado);
        this.cargandoHoras.set(false);
        this.tryRender('horas');
      },
      error: () => this.cargandoHoras.set(false)
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.tryRender('dia');
    this.tryRender('productos');
    this.tryRender('horas');
  }

  ngOnDestroy() {
    this.chartDia?.destroy();
    this.chartProductos?.destroy();
    this.chartHoras?.destroy();
  }

  private tryRender(chart: 'dia' | 'productos' | 'horas') {
    if (!this.viewReady) return;
    setTimeout(() => {
      if (chart === 'dia'       && this.datosDia().length)       this.renderDia();
      if (chart === 'productos' && this.datosProductos().length) this.renderProductos();
      if (chart === 'horas'     && this.datosHoras().length)     this.renderHoras();
    });
  }

  private renderDia() {
    this.chartDia?.destroy();
    const ctx = this.canvasDia.nativeElement.getContext('2d')!;
    this.chartDia = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosDia().map(d => ETIQUETAS_DIAS[d.dia] ?? d.dia),
        datasets: [{
          label: 'Total (S/)',
          data: this.datosDia().map(d => d.total),
          backgroundColor: '#FBBF24',
          hoverBackgroundColor: '#F59E0B',
          borderRadius: 7,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` S/ ${(ctx.raw as number).toFixed(2)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: { callback: v => `S/ ${v}` }
          }
        }
      }
    });
  }

  private renderProductos() {
    this.chartProductos?.destroy();
    const ctx = this.canvasProductos.nativeElement.getContext('2d')!;
    this.chartProductos = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.datosProductos().map(p => p.nombre),
        datasets: [{
          label: 'Unidades vendidas',
          data: this.datosProductos().map(p => p.cantidadVendida),
          backgroundColor: '#1D4ED8',
          hoverBackgroundColor: '#1E40AF',
          borderRadius: 7,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.raw} unidades`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: { stepSize: 1 }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }

  private renderHoras() {
    this.chartHoras?.destroy();
    const ctx = this.canvasHoras.nativeElement.getContext('2d')!;
    this.chartHoras = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.datosHoras().map(h => {
          const hh = h.hora;
          return hh === 0 ? '12am' : hh < 12 ? `${hh}am` : hh === 12 ? '12pm' : `${hh - 12}pm`;
        }),
        datasets: [{
          label: 'Ventas (S/)',
          data: this.datosHoras().map(h => h.totalVentas),
          borderColor: '#1D4ED8',
          backgroundColor: 'rgba(29,78,216,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#FBBF24',
          pointBorderColor: '#1D4ED8',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` S/ ${(ctx.raw as number).toFixed(2)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: '#F3F4F6' },
            ticks: { callback: v => `S/ ${v}` }
          }
        }
      }
    });
  }

  buscarCliente() {
    const dni = this.dniSearch.trim();
    if (dni.length !== 8) {
      this.errorCliente.set('Ingresa un DNI válido de 8 dígitos.');
      return;
    }
    this.cargandoCliente.set(true);
    this.errorCliente.set('');
    this.boletasCliente.set([]);

    this.api.getBoletasByDni(dni).subscribe({
      next: data => {
        this.boletasCliente.set(data);
        this.dniConsultado.set(dni);
        this.cargandoCliente.set(false);
      },
      error: () => {
        this.cargandoCliente.set(false);
        this.errorCliente.set('No se encontraron resultados o ocurrió un error.');
      }
    });
  }

  toggleBoleta(id: number) {
    this.boletaExpandida.update(actual => actual === id ? null : id);
  }
}
