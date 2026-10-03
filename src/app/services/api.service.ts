import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Producto, ProductoForm } from '../models/producto.model';
import { Boleta, BoletaRequest } from '../models/boleta.model';
import { VentaPorDia, ProductoMasVendido, VentaPorHora } from '../models/reporte.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getProductos(categoria?: string): Observable<Producto[]> {
    const url = categoria
      ? `${this.base}/productos?categoria=${encodeURIComponent(categoria)}`
      : `${this.base}/productos`;
    return this.http.get<Producto[]>(url);
  }

  createProducto(data: ProductoForm): Observable<Producto> {
    return this.http.post<Producto>(`${this.base}/productos`, data);
  }

  addStock(id: number, cantidad: number): Observable<Producto> {
    return this.http.patch<Producto>(`${this.base}/productos/${id}/stock`, { cantidad });
  }

  getBoletas(): Observable<Boleta[]> {
    return this.http.get<any[]>(`${this.base}/boletas`).pipe(
      map(data => data.map(b => this.normalizarBoleta(b)))
    );
  }

  createBoleta(data: BoletaRequest): Observable<Boleta> {
    return this.http.post<any>(`${this.base}/boletas`, data).pipe(
      map(b => this.normalizarBoleta(b))
    );
  }

  /** Reemplazo completo. Omitir un campo lo deja vacío: usar solo con el objeto entero. */
  updateProducto(id: number, data: ProductoForm): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/productos/${id}`, data);
  }

  /** Actualización parcial: solo toca los campos enviados. Es la que usa la
   *  edición del inventario, para que añadir campos al backend no los borre. */
  patchProducto(id: number, data: Partial<ProductoForm>): Observable<Producto> {
    return this.http.patch<Producto>(`${this.base}/productos/${id}`, data);
  }

  /** Categorías existentes, según el backend. */
  getCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/categorias`);
  }

  deleteProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/productos/${id}`);
  }

  getVentasPorDia(): Observable<VentaPorDia[]> {
    return this.http.get<VentaPorDia[]>(`${this.base}/reportes/dia-mas-productivo`);
  }

  getProductosMasVendidos(): Observable<ProductoMasVendido[]> {
    return this.http.get<ProductoMasVendido[]>(`${this.base}/reportes/productos-mas-vendidos`);
  }

  getVentasPorHora(): Observable<VentaPorHora[]> {
    return this.http.get<VentaPorHora[]>(`${this.base}/reportes/ventas-por-hora`);
  }

  getBoletasByDni(dni: string): Observable<Boleta[]> {
    return this.http.get<any[]>(`${this.base}/boletas/cliente/${dni}`).pipe(
      map(data => data.map(b => this.normalizarBoleta(b)))
    );
  }

  deleteBoleta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/boletas/${id}`);
  }

  getBoletasFiado(): Observable<Boleta[]> {
    return this.http.get<any[]>(`${this.base}/boletas/fiado`).pipe(
      map(data => data.map(b => this.normalizarBoleta(b)))
    );
  }

  marcarPagado(id: number): Observable<Boleta> {
    return this.http.put<any>(`${this.base}/boletas/${id}/pagar`, {}).pipe(
      map(b => this.normalizarBoleta(b))
    );
  }

  /**
   * Normaliza lo que llega del backend. Los `?? ''` de cliente no son adorno:
   * el buscador del historial hace `b.clienteDni.includes(...)`, y un null ahi
   * tiraba la vista entera en cuanto alguien escribia en el campo de busqueda.
   */
  private normalizarBoleta(b: any): Boleta {
    return {
      ...b,
      clienteNombre: b.clienteNombre ?? '',
      clienteDni:    b.clienteDni    ?? '',
      total:         b.total         ?? 0,
      formaPago:  b.formaPago  ?? b.forma_pago  ?? undefined,
      estadoPago: b.estadoPago ?? b.estado_pago ?? undefined,
      detalles: (b.detalles ?? []).map((d: any) => ({
        ...d,
        productoId:     d.productoId     ?? d.producto?.id     ?? 0,
        productoNombre: d.productoNombre ?? d.producto?.nombre ?? '',
        cantidad:       d.cantidad       ?? 0,
        subtotal:       d.subtotal       ?? 0,
        precioUnitario: d.precioUnitario
          ?? (d.cantidad ? (d.subtotal ?? 0) / d.cantidad : d.producto?.precio ?? 0),
      })),
    };
  }
}
