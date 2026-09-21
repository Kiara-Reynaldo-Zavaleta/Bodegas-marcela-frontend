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

  updateProducto(id: number, data: ProductoForm): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/productos/${id}`, data);
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

  private normalizarBoleta(b: any): Boleta {
    return {
      ...b,
      formaPago:  b.formaPago  ?? b.forma_pago  ?? undefined,
      estadoPago: b.estadoPago ?? b.estado_pago ?? undefined,
    };
  }
}
