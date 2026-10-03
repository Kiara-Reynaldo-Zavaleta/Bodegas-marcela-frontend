import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { ImpresionService } from '../../services/impresion.service';
import { Boleta } from '../../models/boleta.model';
import { ResumenCaja } from '../../models/reporte.model';
import { Producto, STOCK_BAJO } from '../../models/producto.model';
import { mensajeDeError } from '../../errores';

import { Dialog } from '../dialog/dialog';
import { ErrorState } from '../error-state/error-state';

const TODAS = 'Todas';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  imports: [RouterLink, DatePipe, DecimalPipe, Dialog, ErrorState]
})
export class Dashboard implements OnInit {
  private api       = inject(ApiService);
  private modal     = inject(ModalService);
  private impresion = inject(ImpresionService);

  readonly STOCK_BAJO = STOCK_BAJO;

  /**
   * Las categorias salen de los productos cargados. La lista que habia escrita
   * a mano no coincidia con los datos reales ("Snacks" vs "Snacks y Golosinas",
   * "Limpieza" vs "Limpieza y Hogar") y ademas incluia dos que no existen
   * ("Higiene", "Enlatados"): cuatro de los siete filtros no mostraban nada.
   */
  categorias = computed(() => [
    TODAS,
    ...[...new Set(this.productos().map(p => p.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'))
  ]);

  /** Las 5 ventas recientes, no el historial entero. */
  boletasRecientes = signal<Boleta[]>([]);
  /** Deuda viva acumulada: viene de /boletas/fiado, no de la caja del día. */
  porCobrar = signal<Boleta[]>([]);
  caja      = signal<ResumenCaja | null>(null);
  productos = signal<Producto[]>([]);

  cargandoCaja      = signal(true);
  cargandoBoletas   = signal(true);
  cargandoProductos = signal(true);
  errorCaja         = signal(false);
  errorBoletas      = signal(false);
  errorProductos    = signal(false);

  boletaSeleccionada = signal<Boleta | null>(null);
  categoriaSeleccionada = signal<string>(TODAS);

  readonly hoy = new Date();

  // --- Resumen del dia ---
  // El cálculo lo hace el backend: decide el día en hora de Lima y suma por
  // fechaPago. Antes había que descargar las 81 boletas completas, con todos
  // sus detalles, solo para sumar cuatro números en el navegador.

  totalCajaHoy     = computed(() => this.caja()?.total ?? 0);
  boletasHoyConteo = computed(() => this.caja()?.boletas ?? 0);

  totalPorCobrar = computed(() =>
    this.porCobrar().reduce((acc, b) => acc + b.total, 0)
  );

  // --- Alertas de stock ---
  // El umbral era `stock === 0`: avisaba cuando ya era tarde. Ahora avisa a
  // partir de STOCK_BAJO, igual que el inventario, y ordena lo mas urgente.
  alertasStock = computed(() =>
    this.productos()
      .filter(p => p.stock <= STOCK_BAJO)
      .sort((a, b) => a.stock - b.stock)
  );

  // Se filtra sobre los productos ya cargados en lugar de pedir cada categoria
  // a la API: es inmediato y no hay estado de carga intermedio.
  productosRapido = computed(() => {
    const cat = this.categoriaSeleccionada();
    return this.productos().filter(p =>
      p.stock > 0 && (cat === TODAS || p.categoria === cat)
    );
  });

  ngOnInit() {
    this.cargarCaja();
    this.cargarBoletas();
    this.cargarProductos();
  }

  cargarCaja() {
    this.cargandoCaja.set(true);
    this.errorCaja.set(false);
    // Sin fecha: el backend usa el día actual en Lima.
    this.api.getCaja().subscribe({
      next: c => { this.caja.set(c); this.cargandoCaja.set(false); },
      error: () => { this.cargandoCaja.set(false); this.errorCaja.set(true); }
    });

    this.api.getBoletasFiado().subscribe({
      next: d => this.porCobrar.set(d),
      error: () => this.porCobrar.set([])
    });
  }

  cargarBoletas() {
    this.cargandoBoletas.set(true);
    this.errorBoletas.set(false);
    this.api.getBoletasPagina(0, 5).subscribe({
      next: p => {
        this.boletasRecientes.set(p.contenido);
        this.cargandoBoletas.set(false);
      },
      error: () => {
        this.cargandoBoletas.set(false);
        this.errorBoletas.set(true);
      }
    });
  }

  cargarProductos() {
    this.cargandoProductos.set(true);
    this.errorProductos.set(false);
    this.api.getProductos().subscribe({
      next: data => {
        this.productos.set(data);
        this.cargandoProductos.set(false);
      },
      // Antes este error era silencioso y la tarjeta mostraba "Sin alertas de
      // stock": tranquilizaba cuando en realidad no se sabia nada.
      error: () => {
        this.cargandoProductos.set(false);
        this.errorProductos.set(true);
      }
    });
  }

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada.set(cat);
  }

  verBoleta(boleta: Boleta) { this.boletaSeleccionada.set(boleta); }
  cerrarModal() { this.boletaSeleccionada.set(null); }
  imprimirBoleta(boleta: Boleta) { this.impresion.imprimir(boleta); }

  async anadirStock(producto: Producto) {
    const resultado = await this.modal.open({
      type: 'prompt',
      title: 'Añadir stock',
      message: producto.nombre,
      rows: [{ label: 'Stock actual', value: String(producto.stock) }],
      inputLabel: '¿Cuántas unidades llegaron?',
      inputPlaceholder: '0',
      inputSufijo: 'unidades',
      inputMin: 1,
      confirmLabel: 'Añadir',
      cancelLabel: 'Cancelar'
    });
    if (!resultado) return;

    this.api.addStock(producto.id, Number(resultado)).subscribe({
      next: actualizado => {
        this.productos.update(list =>
          list.map(p => p.id === actualizado.id ? actualizado : p)
        );
      },
      error: err => this.modal.alertarError(
        'No se pudo añadir el stock',
        mensajeDeError(err, 'añadir el stock') +
          ` El stock de "${producto.nombre}" sigue en ${producto.stock}.`
      )
    });
  }

  async eliminarBoleta(boleta: Boleta) {
    const ok = await this.modal.open({
      type: 'confirm',
      title: '¿Eliminar esta boleta?',
      rows: [
        { label: 'Boleta',  value: `N.° ${boleta.id.toString().padStart(3, '0')}` },
        { label: 'Cliente', value: boleta.clienteNombre || 'Cliente varios' },
        { label: 'Total',   value: `S/ ${boleta.total.toFixed(2)}` }
      ],
      advertencia: 'La venta saldrá de los reportes y de la caja, y los productos volverán al inventario. No se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'No, conservar',
      confirmDanger: true
    });
    if (!ok) return;

    this.api.deleteBoleta(boleta.id).subscribe({
      next: () => {
        // Se recarga: al quitar una de las 5 recientes entra la sexta, y la
        // caja del día cambia.
        this.cargarBoletas();
        this.cargarCaja();
      },
      error: err => this.modal.alertarError(
        'No se pudo eliminar',
        mensajeDeError(err, 'eliminar la boleta') + ' La boleta sigue registrada.'
      )
    });
  }

  /** Desglose de la caja. Los números ya vienen calculados del backend. */
  async resumenCaja() {
    const c = this.caja();
    if (!c) {
      await this.modal.alertarError(
        'No se pudo cargar la caja',
        'Todavía no hay datos del día. Revisa tu conexión y vuelve a intentarlo.'
      );
      return;
    }

    const sol = (n: number) => `S/ ${n.toFixed(2)}`;
    await this.modal.open({
      type: 'info',
      title: 'Resumen de caja de hoy',
      rows: [
        { label: 'Fecha',              value: c.fecha },
        { label: 'Boletas emitidas',   value: String(c.boletas) },
        { label: 'Efectivo',           value: sol(c.efectivo) },
        { label: 'Yape',               value: sol(c.yape) },
        { label: 'Plin',               value: sol(c.plin) },
        { label: 'Total cobrado hoy',  value: sol(c.total) },
        { label: 'Fiado de hoy',       value: sol(c.fiado) },
        { label: 'Por cobrar (total)', value: sol(this.totalPorCobrar()) }
      ],
      confirmLabel: 'Cerrar'
    });
  }
}
