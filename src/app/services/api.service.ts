import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto, ProductoForm } from '../models/producto.model';
import { Boleta, BoletaRequest } from '../models/boleta.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8080/api';

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
}
