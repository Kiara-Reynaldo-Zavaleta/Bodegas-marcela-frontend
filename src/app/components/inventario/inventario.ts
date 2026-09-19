import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
  imports: [FormsModule, DecimalPipe]
})
export class Inventario implements OnInit {
  private api = inject(ApiService);
  private modal = inject(ModalService);

  productos = signal<Producto[]>([]);
  loading = signal(true);
  busqueda = '';
  mostrarFormulario = signal(false);
  guardando = signal(false);
  errorForm = signal('');

  nuevoNombre = '';
  nuevoPrecio: number | null = null;
  nuevoStock: number | null = null;

  get productosFiltrados(): Producto[] {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) return this.productos();
    return this.productos().filter(p => p.nombre.toLowerCase().includes(q));
  }

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    this.api.getProductos().subscribe({
      next: data => {
        this.productos.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  abrirFormulario() {
    this.nuevoNombre = '';
    this.nuevoPrecio = null;
    this.nuevoStock = null;
    this.errorForm.set('');
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario() {
    this.mostrarFormulario.set(false);
  }

  guardarProducto() {
    if (!this.nuevoNombre.trim() || !this.nuevoPrecio || this.nuevoStock === null) {
      this.errorForm.set('Completa todos los campos.');
      return;
    }
    if (this.nuevoPrecio <= 0) {
      this.errorForm.set('El precio debe ser mayor a 0.');
      return;
    }
    this.guardando.set(true);
    this.errorForm.set('');

    this.api.createProducto({
      nombre: this.nuevoNombre.trim(),
      precio: this.nuevoPrecio,
      stock: this.nuevoStock
    }).subscribe({
      next: creado => {
        this.productos.update(list => [...list, creado]);
        this.guardando.set(false);
        this.cerrarFormulario();
      },
      error: () => {
        this.guardando.set(false);
        this.errorForm.set('Error al guardar el producto. Intente nuevamente.');
      }
    });
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
}
