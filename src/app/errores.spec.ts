import { HttpErrorResponse } from '@angular/common/http';
import { leerError, mensajeDeError, textoStockInsuficiente, SIN_CONEXION } from './errores';

/** Construye la respuesta tal como la documentó el backend. */
function respuesta(status: number, cuerpo: unknown) {
  return new HttpErrorResponse({ status, error: cuerpo, url: '/api/boletas' });
}

describe('lectura de errores del backend', () => {
  it('reconoce el formato {timestamp, status, codigo, error, message}', () => {
    const e = leerError(respuesta(404, {
      timestamp: '2026-10-02T21:53:29-05:00',
      status: 404, codigo: 'RECURSO_NO_ENCONTRADO',
      error: 'Not Found', message: 'Producto no encontrado'
    }));
    expect(e.codigo).toBe('RECURSO_NO_ENCONTRADO');
    expect(e.mensaje).toBe('Producto no encontrado');
  });

  it('distingue "no hubo respuesta" de "el servidor respondió con error"', () => {
    expect(leerError(respuesta(0, null)).codigo).toBe(SIN_CONEXION);
    expect(leerError(respuesta(500, { codigo: 'ERROR_INTERNO' })).codigo).toBe('ERROR_INTERNO');
  });

  it('no se rompe si el cuerpo no tiene el formato esperado', () => {
    // Un proxy, un HTML de error o un backend viejo no deben tirar la pantalla.
    expect(leerError(respuesta(502, '<html>Bad Gateway</html>')).codigo).toBe('ERROR_INTERNO');
    expect(leerError(respuesta(500, undefined)).mensaje).toBe('');
    expect(mensajeDeError(respuesta(502, '<html>'), 'guardar')).toContain('No se pudo guardar');
  });
});

describe('mensaje de stock insuficiente', () => {
  const base = {
    timestamp: '2026-10-02T21:53:29-05:00', status: 409,
    codigo: 'STOCK_INSUFICIENTE', error: 'Conflict',
    message: 'Stock insuficiente'
  };

  it('dice qué producto falta, cuánto queda y cuánto se pidió', () => {
    const texto = mensajeDeError(
      respuesta(409, { ...base, productoId: 6, producto: 'Lentejas 500 g', stockDisponible: 3, cantidadSolicitada: 5 }),
      'registrar la venta'
    );
    expect(texto).toContain('Lentejas 500 g');
    expect(texto).toContain('quedan 3 unidades');
    expect(texto).toContain('estás vendiendo 5');
  });

  it('concuerda en singular y en el caso de cero', () => {
    const uno = textoStockInsuficiente(leerError(
      respuesta(409, { ...base, producto: 'Sal Emsal', stockDisponible: 1, cantidadSolicitada: 2 })));
    expect(uno).toContain('queda 1 unidad');

    const cero = textoStockInsuficiente(leerError(
      respuesta(409, { ...base, producto: 'Sal Emsal', stockDisponible: 0, cantidadSolicitada: 1 })));
    expect(cero).toContain('ya no queda nada');
  });

  it('se degrada si faltan los campos extra', () => {
    const texto = textoStockInsuficiente(leerError(respuesta(409, base)));
    expect(texto).toContain('stock suficiente');
  });
});
