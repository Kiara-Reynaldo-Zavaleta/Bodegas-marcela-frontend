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

  readonly CATEGORIAS = ['Todas', 'Abarrotes', 'Bebidas', 'Snacks', 'Limpieza', 'Higiene', 'Enlatados', 'Lácteos'];
  categoriaSeleccionada = signal<string>('Todas');
  productosFiltradosCat = signal<Producto[]>([]);
  cargandoCat = signal(false);

  productosRapido = computed(() =>
    this.categoriaSeleccionada() === 'Todas'
      ? this.productosConStock()
      : this.productosFiltradosCat()
  );

  ngOnInit() {
    this.api.getBoletas().subscribe({
      next: data => {
        this.boletas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.api.getProductos().subscribe({
      next: data => this.productos.set(data)
    });
  }

  boletasRecientes = computed(() =>
    [...this.boletas()].sort((a, b) => b.id - a.id).slice(0, 5)
  );

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada.set(cat);
    if (cat === 'Todas') return;
    this.cargandoCat.set(true);
    this.productosFiltradosCat.set([]);
    this.api.getProductos(cat).subscribe({
      next: data => {
        this.productosFiltradosCat.set(data);
        this.cargandoCat.set(false);
      },
      error: () => this.cargandoCat.set(false)
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

  async resumenCaja() {
    const hoy = new Date().toLocaleDateString('es-PE');
    const boletasHoy = this.boletas().filter(b =>
      new Date(b.fecha).toLocaleDateString('es-PE') === hoy
    );

    const pagadas = boletasHoy.filter(b => b.estadoPago === 'PAGADO');
    const fiadas  = boletasHoy.filter(b => b.estadoPago === 'FIADO');

    const suma = (lista: Boleta[]) => lista.reduce((acc, b) => acc + b.total, 0);
    const totalEfectivo = suma(pagadas.filter(b => b.formaPago === 'EFECTIVO'));
    const totalYape     = suma(pagadas.filter(b => b.formaPago === 'YAPE'));
    const totalPlin     = suma(pagadas.filter(b => b.formaPago === 'PLIN'));
    const totalFiado    = suma(fiadas);
    const totalCaja     = totalEfectivo + totalYape + totalPlin;

    await this.modal.open({
      type: 'info',
      title: 'Resumen de Caja Diario',
      rows: [
        { label: 'Fecha',              value: hoy },
        { label: 'Boletas emitidas',   value: String(boletasHoy.length) },
        { label: 'Efectivo',           value: `S/ ${totalEfectivo.toFixed(2)}` },
        { label: 'Yape',               value: `S/ ${totalYape.toFixed(2)}` },
        { label: 'Plin',               value: `S/ ${totalPlin.toFixed(2)}` },
        { label: 'Total en caja',      value: `S/ ${totalCaja.toFixed(2)}` },
        { label: 'Pendiente (fiado)',  value: `S/ ${totalFiado.toFixed(2)}` },
      ],
      confirmLabel: 'Cerrar'
    });
  }
}
