export interface DetalleBoleta {
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Boleta {
  id: number;
  clienteNombre: string;
  clienteDni: string;
  fecha: string;
  total: number;
  estado: 'CONFIRMADA' | 'PENDIENTE' | 'ANULADA';
  detalles: DetalleBoleta[];
}

export interface BoletaRequest {
  clienteNombre: string;
  clienteDni: string;
  items: { productoId: number; cantidad: number }[];
}
