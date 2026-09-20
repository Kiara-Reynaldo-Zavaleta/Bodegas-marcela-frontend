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
