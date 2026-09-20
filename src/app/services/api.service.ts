import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto, ProductoForm } from '../models/producto.model';
import { Boleta, BoletaRequest } from '../models/boleta.model';
import { VentaPorDia, ProductoMasVendido, VentaPorHora } from '../models/reporte.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.base}/productos`);
  }

  createProducto(data: ProductoForm): Observable<Producto> {
    return this.http.post<Producto>(`${this.base}/productos`, data);
  }

  addStock(id: number, cantidad: number): Observable<Producto> {
    return this.http.patch<Producto>(`${this.base}/productos/${id}/stock`, { cantidad });
  }

  getBoletas(): Observable<Boleta[]> {
    return this.http.get<Boleta[]>(`${this.base}/boletas`);
  }

  createBoleta(data: BoletaRequest): Observable<Boleta> {
    return this.http.post<Boleta>(`${this.base}/boletas`, data);
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
    return this.http.get<Boleta[]>(`${this.base}/boletas/cliente/${dni}`);
  }

  deleteBoleta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/boletas/${id}`);
  }

  getBoletasFiado(): Observable<Boleta[]> {
    return this.http.get<Boleta[]>(`${this.base}/boletas/fiado`);
  }

  marcarPagado(id: number): Observable<Boleta> {
    return this.http.put<Boleta>(`${this.base}/boletas/${id}/pagar`, {});
  }
}
