export interface VentaPorDia {
  dia: string;
  cantidadBoletas: number;
  totalRecaudado: number;
}

export interface ProductoMasVendido {
  nombre: string;
  cantidadVendida: number;
}

export interface VentaPorHora {
  hora: number;
  cantidadVentas: number;
  totalRecaudado: number;
}

/**
 * Caja de un día, calculada por el backend.
 * El día lo decide el servidor en hora de Lima, que es más fiable que el reloj
 * del celular. Los montos cobrados se cuentan por fechaPago, así que un fiado
 * de ayer cobrado hoy entra en la caja de hoy.
 */
export interface ResumenCaja {
  fecha: string;
  boletas: number;
  efectivo: number;
  yape: number;
  plin: number;
  total: number;
  /** Fiado emitido ese día (no es la deuda total acumulada). */
  fiado: number;
}

/** Respuesta paginada del backend. `pagina` empieza en 0. */
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}
