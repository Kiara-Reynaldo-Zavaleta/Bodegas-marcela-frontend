import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Producto } from '../../models/producto.model';
import { DetalleBoleta } from '../../models/boleta.model';

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.html',
  styleUrl: './ventas.css',
  imports: [FormsModule, DecimalPipe]
})
export class Ventas implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private modal = inject(ModalService);

  clienteNombre = '';
  clienteDni = '';
  busqueda = '';

  productos           = signal<Producto[]>([]);
  detalles            = signal<DetalleBoleta[]>([]);
  confirmando         = signal(false);
  errorMsg            = signal('');
  buscandoCliente     = signal(false);
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
    return (
      this.clienteNombre.trim().length > 0 &&
      this.clienteDni.trim().length === 8 &&
      this.detalles().length > 0
    );
  }

  ngOnInit() {
    this.api.getProductos().subscribe({ next: data => this.productos.set(data) });
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
    const det = this.detalles().find(d => d.productoId === productoId);
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
      clienteNombre: this.clienteNombre.trim(),
      clienteDni: this.clienteDni.trim(),
      items: this.detalles().map(d => ({ productoId: d.productoId, cantidad: d.cantidad }))
    }).subscribe({
      next: (boleta) => {
        this.confirmando.set(false);
        this.detalles.set([]);
        this.clienteNombre = '';
        this.clienteDni = '';
        this.busqueda = '';
        this.nombreAutocompletado.set(false);
        this.ultimoDniBuscado = '';

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
