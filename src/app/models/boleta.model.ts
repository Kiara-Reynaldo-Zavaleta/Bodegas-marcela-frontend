export type FormaPago = 'EFECTIVO' | 'YAPE' | 'PLIN';
export type EstadoPago = 'PAGADO' | 'FIADO';

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
  formaPago: FormaPago;
  estadoPago: EstadoPago;
  detalles: DetalleBoleta[];
}

export interface BoletaRequest {
  clienteNombre: string;
  clienteDni: string;
  formaPago: FormaPago;
  estadoPago: EstadoPago;
  items: { productoId: number; cantidad: number }[];
}
