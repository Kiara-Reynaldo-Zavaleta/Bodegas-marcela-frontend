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
import { ErrorState } from '../error-state/error-state';

Chart.register(
  CategoryScale, LinearScale,
  BarElement, BarController,
  PointElement, LineElement, LineController,
  Title, Tooltip, Legend, Filler
);

// Chart.js rotula por defecto en 12px con gris claro. Los ejes y los tooltips
// son el unico texto de los reportes, asi que suben a 14px con un gris que
// cumple contraste (#4B5563 = 7.6:1 sobre blanco).
Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
Chart.defaults.font.size = 14;
Chart.defaults.color = '#4B5563';
Chart.defaults.plugins.tooltip.titleFont = { size: 14, weight: 'bold' };
Chart.defaults.plugins.tooltip.bodyFont = { size: 15 };
Chart.defaults.plugins.tooltip.padding = 10;

const ORDEN_DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const ETIQUETAS_DIAS: Record<string, string> = {
  'Lunes': 'Lun', 'Martes': 'Mar', 'Miércoles': 'Mié',
  'Jueves': 'Jue', 'Viernes': 'Vie', 'Sábado': 'Sáb', 'Domingo': 'Dom'
};

type Grafico = 'dia' | 'productos' | 'horas';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
  imports: [FormsModule, DatePipe, DecimalPipe, ErrorState]
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
  private timeouts: number[] = [];

  datosDia       = signal<VentaPorDia[]>([]);
  datosProductos = signal<ProductoMasVendido[]>([]);
  datosHoras     = signal<VentaPorHora[]>([]);

  cargandoDia       = signal(true);
  cargandoProductos = signal(true);
  cargandoHoras     = signal(true);

  // Antes un fallo de red acababa en "Sin datos disponibles", que dice algo
  // distinto (y tranquilizador) de lo que paso realmente.
  errorDia       = signal(false);
  errorProductos = signal(false);
  errorHoras     = signal(false);

  /** Los <canvas> son invisibles para un lector de pantalla y leer una cifra
   *  exacta de un grafico con presbicia es dificil: cada uno puede mostrarse
   *  tambien como tabla. */
  tablasVisibles = signal<Record<Grafico, boolean>>({ dia: false, productos: false, horas: false });

  dniSearch       = signal('');
  cargandoCliente = signal(false);
  boletasCliente  = signal<Boleta[]>([]);
  errorCliente    = signal('');
  dniConsultado   = signal('');
  boletaExpandida = signal<number | null>(null);
  totalCliente    = computed(() => this.boletasCliente().reduce((acc, b) => acc + b.total, 0));

  ngOnInit() {
    this.cargarDia();
    this.cargarProductos();
    this.cargarHoras();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.tryRender('dia');
    this.tryRender('productos');
    this.tryRender('horas');
  }

  ngOnDestroy() {
    this.timeouts.forEach(clearTimeout);
    this.chartDia?.destroy();
    this.chartProductos?.destroy();
    this.chartHoras?.destroy();
  }

  cargarDia() {
    this.cargandoDia.set(true);
    this.errorDia.set(false);
    this.api.getVentasPorDia().subscribe({
      next: data => {
        this.datosDia.set(
          [...data].sort((a, b) => ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia))
        );
        this.cargandoDia.set(false);
        this.tryRender('dia');
      },
      error: () => { this.cargandoDia.set(false); this.errorDia.set(true); }
    });
  }

  cargarProductos() {
    this.cargandoProductos.set(true);
    this.errorProductos.set(false);
    this.api.getProductosMasVendidos().subscribe({
      next: data => {
        this.datosProductos.set(data.slice(0, 8));
        this.cargandoProductos.set(false);
        this.tryRender('productos');
      },
      error: () => { this.cargandoProductos.set(false); this.errorProductos.set(true); }
    });
  }

  cargarHoras() {
    this.cargandoHoras.set(true);
    this.errorHoras.set(false);
    this.api.getVentasPorHora().subscribe({
      next: data => {
        this.datosHoras.set([...data].sort((a, b) => a.hora - b.hora));
        this.cargandoHoras.set(false);
        this.tryRender('horas');
      },
      error: () => { this.cargandoHoras.set(false); this.errorHoras.set(true); }
    });
  }

  /** Para la tabla se omiten las horas sin ninguna venta: el backend devuelve
   *  las 24, y en el grafico aportan la forma del dia, pero como lista son
   *  una docena larga de filas en cero. */
  horasConVentas = computed(() => this.datosHoras().filter(h => h.cantidadVentas > 0));

  alternarTabla(g: Grafico) {
    this.tablasVisibles.update(v => ({ ...v, [g]: !v[g] }));
  }

  etiquetaHora(h: number): string {
    return h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`;
  }

  private tryRender(chart: Grafico) {
    if (!this.viewReady) return;
    // Los timeouts se guardan para cancelarlos al destruir el componente.
    const id = window.setTimeout(() => {
      if (chart === 'dia'       && this.datosDia().length)       this.renderDia();
      if (chart === 'productos' && this.datosProductos().length) this.renderProductos();
      if (chart === 'horas'     && this.datosHoras().length)     this.renderHoras();
    });
    this.timeouts.push(id);
  }

  private renderDia() {
    if (!this.canvasDia) return;
    this.chartDia?.destroy();
    this.chartDia = new Chart(this.canvasDia.nativeElement.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: this.datosDia().map(d => ETIQUETAS_DIAS[d.dia] ?? d.dia),
        datasets: [{
          label: 'Total (S/)',
          data: this.datosDia().map(d => d.totalRecaudado),
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
          tooltip: { callbacks: { label: ctx => ` S/ ${(ctx.raw as number).toFixed(2)}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#F3F4F6' }, ticks: { callback: v => `S/ ${v}` } }
        }
      }
    });
  }

  private renderProductos() {
    if (!this.canvasProductos) return;
    this.chartProductos?.destroy();
    this.chartProductos = new Chart(this.canvasProductos.nativeElement.getContext('2d')!, {
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
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw} unidades` } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: '#F3F4F6' }, ticks: { stepSize: 1 } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  private renderHoras() {
    if (!this.canvasHoras) return;
    this.chartHoras?.destroy();
    this.chartHoras = new Chart(this.canvasHoras.nativeElement.getContext('2d')!, {
      type: 'line',
      data: {
        labels: this.datosHoras().map(h => this.etiquetaHora(h.hora)),
        datasets: [{
          label: 'Ventas (S/)',
          data: this.datosHoras().map(h => h.totalRecaudado),
          borderColor: '#1D4ED8',
          backgroundColor: 'rgba(29,78,216,0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#FBBF24',
          pointBorderColor: '#1D4ED8',
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` S/ ${(ctx.raw as number).toFixed(2)}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#F3F4F6' }, ticks: { callback: v => `S/ ${v}` } }
        }
      }
    });
  }

  // --- Cuanto ha comprado un cliente ---

  /** Solo digitos: el campo aceptaba letras en un DNI de 8 numeros. */
  alEscribirDni(valor: string) {
    this.dniSearch.set((valor ?? '').replace(/\D/g, '').slice(0, 8));
    if (this.errorCliente()) this.errorCliente.set('');
  }

  buscarCliente() {
    const dni = this.dniSearch().trim();
    if (dni.length !== 8) {
      this.errorCliente.set('El DNI tiene 8 números. Escríbelos completos para buscar.');
      return;
    }
    this.cargandoCliente.set(true);
    this.errorCliente.set('');
    this.boletasCliente.set([]);

    this.api.getBoletasByDni(dni).subscribe({
      next: data => {
        this.boletasCliente.set([...data].sort((a, b) => b.id - a.id));
        this.dniConsultado.set(dni);
        this.cargandoCliente.set(false);
      },
      error: () => {
        this.cargandoCliente.set(false);
        this.errorCliente.set('No se pudo consultar. Revisa tu conexión e inténtalo otra vez.');
      }
    });
  }

  toggleBoleta(id: number) {
    this.boletaExpandida.update(actual => actual === id ? null : id);
  }
}
