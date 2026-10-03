/**
 * El negocio opera en hora de Lima, pase lo que pase con el reloj del celular.
 *
 * Qué día es "hoy" lo decide el backend (GET /reportes/caja sin fecha), no el
 * navegador: un celular con la zona horaria mal puesta contaría las ventas de
 * la noche en el día siguiente. Aquí solo queda lo necesario para MOSTRAR
 * fechas en hora de Lima.
 */
export const ZONA_BODEGA = 'America/Lima';

/** Perú no aplica horario de verano desde 1994, así que el offset es fijo.
 *  DatePipe de Angular acepta offset, no nombres IANA. */
export const OFFSET_BODEGA = '-0500';
