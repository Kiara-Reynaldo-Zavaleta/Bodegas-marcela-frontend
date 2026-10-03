import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Producto, STOCK_BAJO } from '../../models/producto.model';
import { mensajeDeError } from '../../errores';
import { Dialog } from '../dialog/dialog';
import { ErrorState } from '../error-state/error-state';

const POR_PAGINA = 25;

/**
 * Acepta "2,50" y "2.50". En Peru el precio se escribe con coma, y un
 * <input type="number"> la rechaza: el campo quedaba vacio y el unico aviso era
 * "Completa todos los campos", que no explica nada. De ahi que los campos
 * numericos sean de texto con inputmode y se parseen aqui.
 */
function parsearDecimal(valor: string): number | null {
  const limpio = valor.trim().replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function parsearEntero(valor: string): number | null {
  const limpio = valor.trim();
  if (!limpio || !/^\d+$/.test(limpio)) return null;
  return Number(limpio);
}

type ModoForm = 'nuevo' | 'editar';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
  imports: [FormsModule, DecimalPipe, Dialog, ErrorState]
})
export class Inventario implements OnInit {
  private api = inject(ApiService);
  private modal = inject(ModalService);

  readonly STOCK_BAJO = STOCK_BAJO;
  /** Marcador del <select> para escribir una categoria que todavia no existe. */
  readonly OTRA = '__otra__';

  productos = signal<Producto[]>([]);
  cargando = signal(true);
  errorCarga = signal(false);

  busqueda = signal('');
  categoriaFiltro = signal('');
  pagina = signal(1);

  // Un solo dialogo para alta y edicion: los dos formularios eran identicos
  // salvo las etiquetas, y estaban duplicados entero en la plantilla.
  modoForm = signal<ModoForm | null>(null);
  private editandoId: number | null = null;
  guardando = signal(false);
  errores = signal<Record<string, string>>({});

  form = { nombre: '', precio: '', stock: '', categoria: '', categoriaNueva: '' };

  /**
   * Las categorias salen de los productos que hay, no de una lista escrita a
   * mano. La lista fija que habia ("Snacks", "Limpieza", "Higiene", "Enlatados")
   * no coincidia con las del backend ("Snacks y Golosinas", "Limpieza y Hogar",
   * ...), asi que varios filtros no devolvian nunca nada.
   */
  private categoriasApi = signal<string[] | null>(null);

  categorias = computed(() => {
    const delApi = this.categoriasApi();
    if (delApi?.length) return delApi;
    // Respaldo: deducirlas de los productos cargados si el endpoint falla.
    return [...new Set(this.productos().map(p => p.categoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));
  });

  productosFiltrados = computed(() => {
    const q = this.busqueda().toLowerCase().trim();
    const cat = this.categoriaFiltro();
    return this.productos().filter(p =>
      (!q || p.nombre.toLowerCase().includes(q)) &&
      (!cat || p.categoria === cat)
    );
  });

  totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.productosFiltrados().length / POR_PAGINA))
  );

  productosPaginados = computed(() => {
    const inicio = (this.pagina() - 1) * POR_PAGINA;
    return this.productosFiltrados().slice(inicio, inicio + POR_PAGINA);
  });

  hayFiltro = computed(() => !!this.busqueda().trim() || !!this.categoriaFiltro());

  ngOnInit() {
    this.cargar();
    this.api.getCategorias().subscribe({
      next: cats => this.categoriasApi.set(cats),
      error: () => this.categoriasApi.set(null)   // se usa el respaldo
    });
  }

  cargar() {
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.api.getProductos().subscribe({
      next: data => {
        this.productos.set(data);
        this.cargando.set(false);
      },
      // Antes esto dejaba la tabla vacia mostrando "Sin productos encontrados",
      // que puede hacer creer que se perdio el inventario.
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set(true);
      }
    });
  }

  alBuscar(valor: string) {
    this.busqueda.set(valor);
    this.pagina.set(1);
  }

  filtrarCategoria(cat: string) {
    this.categoriaFiltro.set(cat);
    this.pagina.set(1);
  }

  limpiarFiltros() {
    this.busqueda.set('');
    this.categoriaFiltro.set('');
    this.pagina.set(1);
  }

  anteriorPagina() { if (this.pagina() > 1) this.pagina.update(p => p - 1); }
  siguientePagina() { if (this.pagina() < this.totalPaginas()) this.pagina.update(p => p + 1); }

  // --- Formulario ---

  abrirAlta() {
    this.editandoId = null;
    this.form = { nombre: '', precio: '', stock: '', categoria: '', categoriaNueva: '' };
    this.errores.set({});
    this.modoForm.set('nuevo');
  }

  abrirEdicion(p: Producto) {
    this.editandoId = p.id;
    this.form = {
      nombre: p.nombre,
      precio: String(p.precio),
      stock: String(p.stock),
      categoria: p.categoria ?? '',
      categoriaNueva: ''
    };
    this.errores.set({});
    this.modoForm.set('editar');
  }

  cerrarForm() {
    this.modoForm.set(null);
  }

  /** Un mensaje por campo, no un "Completa todos los campos" para todo. */
  private validar(): { nombre: string; precio: number; stock: number; categoria: string } | null {
    const e: Record<string, string> = {};

    const nombre = this.form.nombre.trim();
    if (!nombre) e['nombre'] = 'Escribe el nombre del producto.';

    const precio = parsearDecimal(this.form.precio);
    if (precio === null) e['precio'] = 'Escribe el precio, por ejemplo 2.50 o 2,50.';
    else if (precio <= 0) e['precio'] = 'El precio debe ser mayor que 0.';

    const stock = parsearEntero(this.form.stock);
    if (stock === null) e['stock'] = 'Escribe el stock como número entero, por ejemplo 12.';

    const categoria = this.form.categoria === this.OTRA
      ? this.form.categoriaNueva.trim()
      : this.form.categoria;
    if (!categoria) {
      e['categoria'] = this.form.categoria === this.OTRA
        ? 'Escribe el nombre de la nueva categoría.'
        : 'Elige una categoría.';
    }

    this.errores.set(e);
    if (Object.keys(e).length) return null;
    return { nombre, precio: precio!, stock: stock!, categoria };
  }

  guardar() {
    const datos = this.validar();
    if (!datos || this.guardando()) return;

    this.guardando.set(true);
    const esEdicion = this.modoForm() === 'editar';
    const peticion = esEdicion
      ? this.api.patchProducto(this.editandoId!, datos)
      : this.api.createProducto(datos);

    peticion.subscribe({
      next: resultado => {
        this.guardando.set(false);
        if (esEdicion) {
          this.productos.update(list => list.map(p => p.id === resultado.id ? resultado : p));
        } else {
          this.productos.update(list => [...list, resultado]);
          // Se limpian los filtros para que el producto recien creado se vea:
          // si no, cae fuera del filtro activo y parece que no se guardo.
          this.limpiarFiltros();
        }
        this.cerrarForm();
      },
      error: err => {
        this.guardando.set(false);
        this.errores.set({
          general: mensajeDeError(err, esEdicion ? 'guardar los cambios' : 'guardar el producto')
        });
      }
    });
  }

  // --- Acciones de fila ---

  async eliminarProducto(producto: Producto) {
    const ok = await this.modal.open({
      type: 'confirm',
      title: '¿Eliminar producto?',
      rows: [
        { label: 'Producto', value: producto.nombre },
        { label: 'Stock actual', value: String(producto.stock) }
      ],
      advertencia: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'No, conservar',
      confirmDanger: true
    });
    if (!ok) return;

    this.api.deleteProducto(producto.id).subscribe({
      next: () => {
        this.productos.update(list => list.filter(p => p.id !== producto.id));
        if (this.pagina() > this.totalPaginas()) this.pagina.set(this.totalPaginas());
      },
      error: err => this.modal.alertarError(
        'No se pudo eliminar',
        mensajeDeError(err, 'eliminar el producto') + ` "${producto.nombre}" sigue en el inventario.`
      )
    });
  }

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

    const cantidad = Number(resultado);
    this.api.addStock(producto.id, cantidad).subscribe({
      next: actualizado => {
        this.productos.update(list =>
          list.map(p => p.id === actualizado.id ? actualizado : p)
        );
      },
      // Sin esto la usuaria pulsaba "Añadir", el numero no cambiaba y nada
      // explicaba por que: o volvia a pulsar y duplicaba, o lo daba por hecho.
      error: err => this.modal.alertarError(
        'No se pudo añadir el stock',
        mensajeDeError(err, 'añadir el stock') +
          ` El stock de "${producto.nombre}" sigue en ${producto.stock}.`
      )
    });
  }
}
