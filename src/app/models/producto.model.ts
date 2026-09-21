export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  activo: boolean;
  categoria: string;
}

export interface ProductoForm {
  nombre: string;
  precio: number;
  stock: number;
}
