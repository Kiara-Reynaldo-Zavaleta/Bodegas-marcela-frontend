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
  /**
   * Obligatoria en los dos sentidos:
   * - El formulario de alta no la pedia, asi que todo producto nuevo nacia sin
   *   categoria y nunca aparecia en los filtros.
   * - El PUT del backend es un reemplazo completo: si se envia sin `categoria`,
   *   la deja en null. Es decir, cada edicion borraba la categoria del producto.
   */
  categoria: string;
}

/** Umbral unico de aviso de stock, compartido por el panel y el inventario. */
export const STOCK_BAJO = 5;
