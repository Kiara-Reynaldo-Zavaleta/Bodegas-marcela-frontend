import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Boleta } from '../../models/boleta.model';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  imports: [RouterLink, NgClass, DatePipe, DecimalPipe]
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  private modal = inject(ModalService);

  boletas = signal<Boleta[]>([]);
  productos = signal<Producto[]>([]);
  loading = signal(true);
  boletaSeleccionada = signal<Boleta | null>(null);

  productosAgotados = computed(() => this.productos().filter(p => p.stock === 0));
  productosConStock = computed(() => this.productos().filter(p => p.stock > 0));

  ngOnInit() {
    this.api.getBoletas().subscribe({
      next: data => {
        this.boletas.set(data.slice(-5).reverse());
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getProductos().subscribe({
      next: data => this.productos.set(data)
    });
  }

  badgeClass(estado: string): string {
    const map: Record<string, string> = {
      CONFIRMADA: 'badge badge-success',
      PENDIENTE: 'badge badge-warning',
      ANULADA: 'badge badge-danger'
    };
    return map[estado] ?? 'badge';
  }

  verBoleta(boleta: Boleta) {
    this.boletaSeleccionada.set(boleta);
  }

  cerrarModal() {
    this.boletaSeleccionada.set(null);
  }

  async anadirStock(producto: Producto) {
    const resultado = await this.modal.open({
      type: 'prompt',
      title: 'Añadir stock',
      message: producto.nombre,
      inputLabel: 'Cantidad a añadir',
      inputPlaceholder: '0',
      inputMin: 1,
      confirmLabel: 'Añadir',
      cancelLabel: 'Cancelar'
    });

    const cantidad = Number(resultado);
    if (!resultado || cantidad <= 0) return;

    this.api.addStock(producto.id, cantidad).subscribe({
      next: actualizado => {
        this.productos.update(list =>
          list.map(p => p.id === actualizado.id ? actualizado : p)
        );
      }
    });
  }

  async resumenCaja() {
    const hoy = new Date().toLocaleDateString('es-PE');
    const boletasHoy = this.boletas().filter(b => {
      const fecha = new Date(b.fecha).toLocaleDateString('es-PE');
      return fecha === hoy;
    });
    const total = boletasHoy.reduce((acc, b) => acc + b.total, 0);

    await this.modal.open({
      type: 'info',
      title: 'Resumen de Caja Diario',
      rows: [
        { label: 'Fecha', value: hoy },
        { label: 'Boletas emitidas', value: String(boletasHoy.length) },
        { label: 'Total recaudado', value: `S/ ${total.toFixed(2)}` }
      ],
      confirmLabel: 'Cerrar'
    });
  }
}
