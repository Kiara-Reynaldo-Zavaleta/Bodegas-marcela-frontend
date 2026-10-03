import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { ImpresionService } from '../../services/impresion.service';
import { Boleta } from '../../models/boleta.model';
import { Producto, STOCK_BAJO } from '../../models/producto.model';
import { mensajeDeError } from '../../errores';
import { diaEnLima, ZONA_BODEGA } from '../../zona-horaria';
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

  boletas  = signal<Boleta[]>([]);
  productos = signal<Producto[]>([]);

  cargandoBoletas   = signal(true);
  cargandoProductos = signal(true);
  errorBoletas      = signal(false);
  errorProductos    = signal(false);

  boletaSeleccionada = signal<Boleta | null>(null);
  categoriaSeleccionada = signal<string>(TODAS);

  readonly hoy = new Date();
  private readonly diaHoy = diaEnLima(this.hoy);

  // --- Resumen del dia ---
  // La pantalla abria con "¡Bienvenida de nuevo!" y nada mas: el dato que
  // importa al abrir (cuanto se vendio hoy) estaba escondido detras de un boton
  // en el pie. Ahora es lo primero.

  /** Compara días en hora de Lima, no en la del dispositivo. Una venta de las
   *  21:00 en Lima es de hoy aunque el celular esté en otra zona horaria. */
  private esHoy(fecha?: string | null): boolean {
    if (!fecha) return false;
    const d = new Date(fecha);
    return !isNaN(d.getTime()) && diaEnLima(d) === this.diaHoy;
  }

  private boletasHoy = computed(() => this.boletas().filter(b => this.esHoy(b.fecha)));

  /** Cobradas hoy: se mide por fechaPago, no por fecha de emision (un fiado
   *  emitido ayer y cobrado hoy entra en la caja de hoy). */
  private pagadasHoy = computed(() =>
    this.boletas().filter(b => b.estadoPago === 'PAGADO' && this.esHoy(b.fechaPago))
  );

  private suma(lista: Boleta[]) { return lista.reduce((acc, b) => acc + b.total, 0); }

  totalCajaHoy    = computed(() => this.suma(this.pagadasHoy()));
  boletasHoyConteo = computed(() => this.boletasHoy().length);

  /** Deuda viva total, no solo la de hoy: es el numero que se cobra. */
  totalPorCobrar = computed(() =>
    this.suma(this.boletas().filter(b => b.estadoPago === 'FIADO'))
  );

  // --- Alertas de stock ---
  // El umbral era `stock === 0`: avisaba cuando ya era tarde. Ahora avisa a
  // partir de STOCK_BAJO, igual que el inventario, y ordena lo mas urgente.
  alertasStock = computed(() =>
    this.productos()
      .filter(p => p.stock <= STOCK_BAJO)
      .sort((a, b) => a.stock - b.stock)
  );

  boletasRecientes = computed(() =>
    [...this.boletas()].sort((a, b) => b.id - a.id).slice(0, 5)
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
    this.cargarBoletas();
    this.cargarProductos();
  }

  cargarBoletas() {
    this.cargandoBoletas.set(true);
    this.errorBoletas.set(false);
    this.api.getBoletas().subscribe({
      next: data => {
        this.boletas.set(data);
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
      next: () => this.boletas.update(list => list.filter(b => b.id !== boleta.id)),
      error: err => this.modal.alertarError(
        'No se pudo eliminar',
        mensajeDeError(err, 'eliminar la boleta') + ' La boleta sigue registrada.'
      )
    });
  }

  /** Desglose del dia. El total ya se ve arriba; esto abre el detalle por medio de pago. */
  async resumenCaja() {
    const pagadas = this.pagadasHoy();
    const fiadasHoy = this.boletasHoy().filter(b => b.estadoPago === 'FIADO');

    const porMedio = (medio: string) =>
      `S/ ${this.suma(pagadas.filter(b => b.formaPago === medio)).toFixed(2)}`;

    await this.modal.open({
      type: 'info',
      title: 'Resumen de caja de hoy',
      rows: [
        { label: 'Fecha',             value: this.hoy.toLocaleDateString('es-PE', { timeZone: ZONA_BODEGA }) },
        { label: 'Boletas emitidas',  value: String(this.boletasHoyConteo()) },
        { label: 'Efectivo',          value: porMedio('EFECTIVO') },
        { label: 'Yape',              value: porMedio('YAPE') },
        { label: 'Plin',              value: porMedio('PLIN') },
        { label: 'Total cobrado hoy', value: `S/ ${this.totalCajaHoy().toFixed(2)}` },
        { label: 'Fiado de hoy',      value: `S/ ${this.suma(fiadasHoy).toFixed(2)}` },
        { label: 'Por cobrar (total)', value: `S/ ${this.totalPorCobrar().toFixed(2)}` }
      ],
      confirmLabel: 'Cerrar'
    });
  }
}
