import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { ImpresionService } from '../../services/impresion.service';
import { Producto } from '../../models/producto.model';
import { Boleta, DetalleBoleta, FormaPago } from '../../models/boleta.model';
import { Pagina } from '../../models/reporte.model';
import { leerError, mensajeDeError, textoStockInsuficiente } from '../../errores';
import { Dialog } from '../dialog/dialog';
import { ErrorState } from '../error-state/error-state';

const POR_PAGINA = 20;

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
  imports: [FormsModule, NgClass, DatePipe, DecimalPipe, Dialog, ErrorState]
})
export class Ventas implements OnInit, OnDestroy {
  private api       = inject(ApiService);
  private modal     = inject(ModalService);
  private impresion = inject(ImpresionService);

  vista = signal<'nueva' | 'historial'>('nueva');

  // --- Nueva venta ---
  clienteNombre = signal('');
  clienteDni    = signal('');
  busqueda      = signal('');
  formaPago: FormaPago = 'EFECTIVO';
  esFiado              = false;

  productos            = signal<Producto[]>([]);
  errorProductos       = signal(false);
  cargandoProductos    = signal(true);
  detalles             = signal<DetalleBoleta[]>([]);
  confirmando          = signal(false);
  errorMsg             = signal('');
  buscandoCliente      = signal(false);
  nombreAutocompletado = signal(false);

  private ultimoDniBuscado = '';

  total = computed(() => this.detalles().reduce((acc, d) => acc + d.subtotal, 0));

  productosFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    if (!q) return this.productos();
    return this.productos().filter(p => p.nombre.toLowerCase().includes(q));
  });

  puedeConfirmar = computed(() => this.detalles().length > 0);

  // --- Historial ---
  // Paginado y buscado en el servidor: antes se descargaban todas las boletas
  // con sus detalles para filtrar y paginar en el navegador.
  pagina             = signal<Pagina<Boleta> | null>(null);
  cargandoHistorial  = signal(false);
  errorHistorial     = signal(false);
  busquedaHistorial  = signal('');
  boletaSeleccionada = signal<Boleta | null>(null);

  private boletasCargadas = false;
  private teclea$ = new Subject<string>();
  private destruido$ = new Subject<void>();

  boletasPaginadas = computed(() => this.pagina()?.contenido ?? []);
  totalElementos   = computed(() => this.pagina()?.totalElementos ?? 0);
  totalPaginas     = computed(() => Math.max(1, this.pagina()?.totalPaginas ?? 1));
  /** El backend cuenta desde 0; en pantalla se muestra desde 1. */
  paginaActual     = computed(() => (this.pagina()?.pagina ?? 0) + 1);
  historialVacio   = computed(() => !this.busquedaHistorial().trim() && this.totalElementos() === 0);

  ngOnInit() {
    this.cargarProductos();

    // Se espera a que deje de escribir para no lanzar una petición por tecla.
    this.teclea$.pipe(debounceTime(300), takeUntil(this.destruido$))
      .subscribe(() => this.cargarHistorial(0));
  }

  ngOnDestroy() {
    this.destruido$.next();
    this.destruido$.complete();
  }

  cargarProductos() {
    this.cargandoProductos.set(true);
    this.errorProductos.set(false);
    this.api.getProductos().subscribe({
      next: data => {
        this.productos.set(data);
        this.cargandoProductos.set(false);
      },
      // Antes esto dejaba el panel izquierdo en blanco y mudo: el mensaje de
      // "sin resultados" solo aparecia si habia algo escrito en el buscador.
      error: () => {
        this.cargandoProductos.set(false);
        this.errorProductos.set(true);
      }
    });
  }

  cambiarVista(v: 'nueva' | 'historial') {
    this.vista.set(v);
    if (v === 'historial' && !this.boletasCargadas) this.cargarHistorial(0);
  }

  cargarHistorial(pagina = 0) {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(false);
    this.api.getBoletasPagina(pagina, POR_PAGINA, this.busquedaHistorial()).subscribe({
      next: p => {
        this.pagina.set(p);
        this.boletasCargadas = true;
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.cargandoHistorial.set(false);
        this.errorHistorial.set(true);
      }
    });
  }

  onBusquedaHistorial(value: string) {
    this.busquedaHistorial.set(value);
    this.teclea$.next(value);
  }

  anteriorPagina() {
    const p = this.pagina();
    if (p && p.pagina > 0) this.cargarHistorial(p.pagina - 1);
  }

  siguientePagina() {
    const p = this.pagina();
    if (p && p.pagina + 1 < p.totalPaginas) this.cargarHistorial(p.pagina + 1);
  }

  verBoleta(boleta: Boleta) { this.boletaSeleccionada.set(boleta); }
  cerrarDetalle() { this.boletaSeleccionada.set(null); }

  imprimirBoleta(boleta: Boleta) { this.impresion.imprimir(boleta); }

  badgeEstadoPago(estadoPago: string): string {
    return estadoPago === 'FIADO' ? 'badge badge-warning' : 'badge badge-success';
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
      // Se recarga la página: al borrar una fila sube la primera de la siguiente.
      next: () => this.cargarHistorial(this.pagina()?.pagina ?? 0),
      error: err => this.modal.alertarError(
        'No se pudo eliminar',
        mensajeDeError(err, 'eliminar la boleta') + ' La boleta sigue registrada.'
      )
    });
  }

  // --- Cliente ---

  /** Solo digitos y maximo 8: el DNI se escribia como texto libre y aceptaba letras. */
  onDniChange(value: string) {
    const limpio = (value ?? '').replace(/\D/g, '').slice(0, 8);
    this.clienteDni.set(limpio);

    if (limpio.length < 8 && this.nombreAutocompletado()) {
      this.clienteNombre.set('');
      this.nombreAutocompletado.set(false);
      this.ultimoDniBuscado = '';
    }
    if (limpio.length === 8 && limpio !== this.ultimoDniBuscado) {
      this.ultimoDniBuscado = limpio;
      this.buscarNombreCliente(limpio);
    }
  }

  onNombreChange(value: string) {
    this.clienteNombre.set(value);
    if (this.nombreAutocompletado()) this.nombreAutocompletado.set(false);
  }

  private buscarNombreCliente(dni: string) {
    this.buscandoCliente.set(true);
    this.api.getBoletasByDni(dni).subscribe({
      next: boletas => {
        this.buscandoCliente.set(false);
        if (!boletas.length) return;
        const masReciente = boletas.reduce((max, b) => b.id > max.id ? b : max);
        this.clienteNombre.set(masReciente.clienteNombre);
        this.nombreAutocompletado.set(true);
      },
      // Es una comodidad, no una funcion critica: si falla, se escribe a mano.
      error: () => this.buscandoCliente.set(false)
    });
  }

  // --- Carrito ---

  agregarProducto(producto: Producto) {
    if (producto.stock === 0) return;

    const existe = this.detalles().find(d => d.productoId === producto.id);
    if (existe) {
      if (existe.cantidad >= producto.stock) return;
      this.incrementar(producto.id);
    } else {
      this.detalles.update(list => [...list, {
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidad: 1,
        precioUnitario: producto.precio,
        subtotal: producto.precio
      }]);
    }
  }

  incrementar(productoId: number) {
    const prod = this.productos().find(p => p.id === productoId);
    const det  = this.detalles().find(d => d.productoId === productoId);
    if (!prod || !det || det.cantidad >= prod.stock) return;
    this.detalles.update(list =>
      list.map(d => d.productoId === productoId
        ? { ...d, cantidad: d.cantidad + 1, subtotal: (d.cantidad + 1) * d.precioUnitario }
        : d
      )
    );
  }

  decrementar(productoId: number) {
    const det = this.detalles().find(d => d.productoId === productoId);
    if (!det) return;
    if (det.cantidad === 1) {
      this.eliminarDetalle(productoId);
    } else {
      this.detalles.update(list =>
        list.map(d => d.productoId === productoId
          ? { ...d, cantidad: d.cantidad - 1, subtotal: (d.cantidad - 1) * d.precioUnitario }
          : d
        )
      );
    }
  }

  eliminarDetalle(productoId: number) {
    this.detalles.update(list => list.filter(d => d.productoId !== productoId));
  }

  sinStockSuficiente(productoId: number, cantidadActual: number): boolean {
    const prod = this.productos().find(p => p.id === productoId);
    return !prod || cantidadActual >= prod.stock;
  }

  // --- Confirmacion ---

  confirmarVenta() {
    if (!this.puedeConfirmar() || this.confirmando()) return;
    this.confirmando.set(true);
    this.errorMsg.set('');

    this.api.createBoleta({
      clienteNombre: this.clienteNombre().trim() || 'Cliente varios',
      clienteDni:    this.clienteDni().trim(),
      formaPago:     this.formaPago,
      estadoPago:    this.esFiado ? 'FIADO' : 'PAGADO',
      items:         this.detalles().map(d => ({ productoId: d.productoId, cantidad: d.cantidad }))
    }).subscribe({
      next: boleta => {
        this.confirmando.set(false);
        const eraFiado = this.esFiado;
        this.limpiarFormulario();

        // El stock se recarga: antes los topes de cantidad seguian saliendo de
        // los datos de la primera carga, cada vez mas desactualizados.
        this.cargarProductos();

        this.modal.open({
          type: 'success',
          title: '¡Venta registrada!',
          rows: [
            { label: 'Boleta', value: `N.° ${boleta.id.toString().padStart(3, '0')}` },
            { label: 'Total',  value: `S/ ${boleta.total.toFixed(2)}` },
            { label: 'Pago',   value: eraFiado ? 'Fiado (pendiente)' : boleta.formaPago }
          ],
          confirmLabel: 'Imprimir boleta',
          cancelLabel: 'Seguir vendiendo'
        }).then(imprimir => {
          if (imprimir) this.impresion.imprimir(boleta);
        });
        // Se queda en "Nueva Venta": antes navegaba al panel y volver a vender
        // costaba dos clics mas por cada cliente.
      },
      error: err => {
        this.confirmando.set(false);
        const e = leerError(err);

        if (e.codigo === 'STOCK_INSUFICIENTE') {
          // El backend dice exactamente qué producto y cuánto queda, así que se
          // dice en lugar de un "algo falló". Y se recarga el stock, porque el
          // que tenía la pantalla ya estaba desactualizado.
          this.errorMsg.set(textoStockInsuficiente(e));
          this.cargarProductos();
          return;
        }
        this.errorMsg.set(
          mensajeDeError(err, 'registrar la venta') + ' No se ha cobrado nada.'
        );
      }
    });
  }

  private limpiarFormulario() {
    this.detalles.set([]);
    this.clienteNombre.set('');
    this.clienteDni.set('');
    this.busqueda.set('');
    this.formaPago = 'EFECTIVO';
    this.esFiado   = false;
    this.nombreAutocompletado.set(false);
    this.ultimoDniBuscado = '';
    this.boletasCargadas  = false;
  }
}
