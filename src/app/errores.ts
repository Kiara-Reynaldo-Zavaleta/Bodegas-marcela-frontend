import { HttpErrorResponse } from '@angular/common/http';

/**
 * Cuerpo de error del backend. Formato acordado:
 *   {timestamp, status, codigo, error, message}
 * y, cuando `codigo` es STOCK_INSUFICIENTE, además:
 *   {productoId, producto, stockDisponible, cantidadSolicitada}
 */
export interface ErrorApi {
  codigo: string;
  mensaje: string;
  status: number;
  productoId?: number;
  producto?: string;
  stockDisponible?: number;
  cantidadSolicitada?: number;
}

/** Código propio para cuando no hubo respuesta: el servidor está caído o no hay red. */
export const SIN_CONEXION = 'SIN_CONEXION';

/**
 * Normaliza cualquier fallo a una forma única. Tolera que el cuerpo no tenga el
 * formato esperado: si el backend cambia o responde otra cosa, se degrada a un
 * mensaje genérico en lugar de romperse.
 */
export function leerError(err: unknown): ErrorApi {
  const http = err as HttpErrorResponse;
  const status = http?.status ?? 0;
  const cuerpo = (http?.error ?? {}) as Record<string, unknown>;

  // status 0 = la petición nunca llegó (sin red, servidor apagado, CORS).
  if (status === 0) {
    return { codigo: SIN_CONEXION, mensaje: '', status: 0 };
  }

  return {
    codigo: typeof cuerpo['codigo'] === 'string' ? cuerpo['codigo'] as string : 'ERROR_INTERNO',
    mensaje: typeof cuerpo['message'] === 'string' ? cuerpo['message'] as string : '',
    status,
    productoId:         cuerpo['productoId']         as number | undefined,
    producto:           cuerpo['producto']           as string | undefined,
    stockDisponible:    cuerpo['stockDisponible']    as number | undefined,
    cantidadSolicitada: cuerpo['cantidadSolicitada'] as number | undefined
  };
}

/**
 * Mensaje para la usuaria. Nunca muestra el texto crudo del backend salvo que
 * sea un error de validación (los únicos redactados para leerse).
 */
export function mensajeDeError(err: unknown, accion: string): string {
  const e = leerError(err);

  if (e.codigo === SIN_CONEXION) {
    return `No se pudo ${accion}: no hay conexión con el sistema. Revisa tu internet e inténtalo otra vez.`;
  }
  if (e.codigo === 'STOCK_INSUFICIENTE') {
    return textoStockInsuficiente(e);
  }
  if (e.codigo === 'VALIDACION' && e.mensaje) {
    return e.mensaje;
  }
  if (e.codigo === 'RECURSO_NO_ENCONTRADO') {
    return `No se pudo ${accion}: ese registro ya no existe. Actualiza la pantalla.`;
  }
  return `No se pudo ${accion}. Inténtalo otra vez en un momento.`;
}

/** El caso que más importa durante una venta: decir qué falta y cuánto. */
export function textoStockInsuficiente(e: ErrorApi): string {
  if (e.producto == null || e.stockDisponible == null) {
    return 'No hay stock suficiente para uno de los productos. Revisa las cantidades.';
  }
  const quedan = e.stockDisponible === 0
    ? `ya no queda nada de "${e.producto}"`
    : `solo ${e.stockDisponible === 1 ? 'queda 1 unidad' : `quedan ${e.stockDisponible} unidades`} de "${e.producto}"`;
  const pedidas = e.cantidadSolicitada != null ? ` y estás vendiendo ${e.cantidadSolicitada}` : '';
  return `La venta no se registró: ${quedan}${pedidas}. Ajusta la cantidad e inténtalo otra vez.`;
}
