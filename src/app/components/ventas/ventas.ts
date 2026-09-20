import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Producto } from '../../models/producto.model';
import { Boleta, DetalleBoleta, FormaPago } from '../../models/boleta.model';

const POR_PAGINA = 20;

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
  imports: [FormsModule, NgClass, DatePipe, DecimalPipe]
})
export class Ventas implements OnInit {
  private api   = inject(ApiService);
  private router = inject(Router);
  private modal  = inject(ModalService);

  vista = signal<'nueva' | 'historial'>('nueva');

  clienteNombre        = '';
  clienteDni           = '';
  busqueda             = '';
  formaPago: FormaPago = 'EFECTIVO';
  esFiado              = false;

  productos            = signal<Producto[]>([]);
  detalles             = signal<DetalleBoleta[]>([]);
  confirmando          = signal(false);
  errorMsg             = signal('');
  buscandoCliente      = signal(false);
  nombreAutocompletado = signal(false);

  private ultimoDniBuscado = '';

  total = computed(() =>
    this.detalles().reduce((acc, d) => acc + d.subtotal, 0)
  );

  get productosFiltrados(): Producto[] {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.productos();
    return this.productos().filter(p => p.nombre.toLowerCase().includes(q));
  }

  get puedeConfirmar(): boolean {
    return this.detalles().length > 0;
  }

  boletas            = signal<Boleta[]>([]);
  cargandoHistorial  = signal(false);
  busquedaHistorial  = signal('');
  paginaActual       = signal(1);
  boletaSeleccionada = signal<Boleta | null>(null);

  private boletasCargadas = false;

  boletasFiltradas = computed(() => {
    const q = this.busquedaHistorial().toLowerCase().trim();
    if (!q) return this.boletas();
    return this.boletas().filter(b =>
      b.clienteNombre.toLowerCase().includes(q) ||
      b.clienteDni.includes(q)
    );
  });

  boletasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * POR_PAGINA;
    return this.boletasFiltradas().slice(inicio, inicio + POR_PAGINA);
  });

  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.boletasFiltradas().length / POR_PAGINA))
  );

  ngOnInit() {
    this.api.getProductos().subscribe({ next: data => this.productos.set(data) });
  }

  cambiarVista(v: 'nueva' | 'historial') {
    this.vista.set(v);
    if (v === 'historial' && !this.boletasCargadas) {
      this.cargandoHistorial.set(true);
      this.api.getBoletas().subscribe({
        next: data => {
          this.boletas.set([...data].reverse());
          this.boletasCargadas = true;
          this.cargandoHistorial.set(false);
        },
        error: () => this.cargandoHistorial.set(false)
      });
    }
  }

  onBusquedaHistorial(value: string) {
    this.busquedaHistorial.set(value);
    this.paginaActual.set(1);
  }

  anteriorPagina() {
    if (this.paginaActual() > 1) this.paginaActual.update(p => p - 1);
  }

  siguientePagina() {
    if (this.paginaActual() < this.totalPaginas()) this.paginaActual.update(p => p + 1);
  }

  verBoleta(boleta: Boleta) {
    this.boletaSeleccionada.set(boleta);
  }

  cerrarDetalle() {
    this.boletaSeleccionada.set(null);
  }

  badgeEstadoPago(estadoPago: string): string {
    return estadoPago === 'FIADO' ? 'badge badge-warning' : 'badge badge-success';
  }

  async eliminarBoleta(boleta: Boleta) {
    const resultado = await this.modal.open({
      type: 'confirm',
      title: '¿Eliminar boleta?',
      rows: [
        { label: 'Cliente', value: boleta.clienteNombre },
        { label: 'Total',   value: `S/ ${boleta.total.toFixed(2)}` }
      ],
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      confirmDanger: true
    });

    if (!resultado) return;

    this.api.deleteBoleta(boleta.id).subscribe({
      next: () => this.boletas.update(list => list.filter(b => b.id !== boleta.id))
    });
  }

  onDniChange(value: string) {
    this.clienteDni = value;
    if (value.length < 8 && this.nombreAutocompletado()) {
      this.clienteNombre = '';
      this.nombreAutocompletado.set(false);
      this.ultimoDniBuscado = '';
    }
    if (value.length === 8 && value !== this.ultimoDniBuscado) {
      this.ultimoDniBuscado = value;
      this.buscarNombreCliente(value);
    }
  }

  onNombreChange(value: string) {
    this.clienteNombre = value;
    if (this.nombreAutocompletado()) {
      this.nombreAutocompletado.set(false);
    }
  }

  private buscarNombreCliente(dni: string) {
    this.buscandoCliente.set(true);
    this.api.getBoletasByDni(dni).subscribe({
      next: boletas => {
        this.buscandoCliente.set(false);
        if (!boletas.length) return;
        const masReciente = boletas.reduce((max, b) => b.id > max.id ? b : max);
        this.clienteNombre = masReciente.clienteNombre;
        this.nombreAutocompletado.set(true);
      },
      error: () => this.buscandoCliente.set(false)
    });
  }

  agregarProducto(producto: Producto) {
    if (producto.stock === 0) return;

    const existe = this.detalles().find(d => d.productoId === producto.id);
    if (existe) {
      if (existe.cantidad >= producto.stock) return;
      this.detalles.update(list =>
        list.map(d => d.productoId === producto.id
          ? { ...d, cantidad: d.cantidad + 1, subtotal: (d.cantidad + 1) * d.precioUnitario }
          : d
        )
      );
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

  confirmarVenta() {
    if (!this.puedeConfirmar || this.confirmando()) return;
    this.confirmando.set(true);
    this.errorMsg.set('');

    this.api.createBoleta({
      clienteNombre: this.clienteNombre.trim() || 'Cliente varios',
      clienteDni:    this.clienteDni.trim() || '',
      formaPago:     this.formaPago,
      estadoPago:    this.esFiado ? 'FIADO' : 'PAGADO',
      items:         this.detalles().map(d => ({ productoId: d.productoId, cantidad: d.cantidad }))
    }).subscribe({
      next: (boleta) => {
        this.confirmando.set(false);
        this.detalles.set([]);
        this.clienteNombre = '';
        this.clienteDni    = '';
        this.busqueda      = '';
        this.formaPago     = 'EFECTIVO';
        this.esFiado       = false;
        this.nombreAutocompletado.set(false);
        this.ultimoDniBuscado = '';
        this.boletasCargadas  = false;

        this.modal.open({
          type: 'success',
          title: 'Venta registrada',
          message: `Boleta #${boleta.id.toString().padStart(3, '0')} · Total S/ ${boleta.total.toFixed(2)}`,
          confirmLabel: 'Aceptar'
        }).then(() => this.router.navigate(['/']));
      },
      error: () => {
        this.confirmando.set(false);
        this.errorMsg.set('Error al registrar la venta. Intente nuevamente.');
      }
    });
  }
}
