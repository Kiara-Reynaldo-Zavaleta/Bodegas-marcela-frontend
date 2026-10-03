/**
 * El negocio opera en hora de Lima, pase lo que pase con el reloj del celular.
 *
 * Importa porque "la caja de hoy" es una pregunta sobre el día de la bodega, no
 * sobre el día del dispositivo: un celular con la zona horaria mal configurada
 * (o en viaje) contaría las ventas de la noche en el día siguiente.
 */
export const ZONA_BODEGA = 'America/Lima';

/** Perú no aplica horario de verano desde 1994, así que el offset es fijo.
 *  DatePipe de Angular acepta offset, no nombres IANA. */
export const OFFSET_BODEGA = '-0500';

const formateadorDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_BODEGA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/** 'YYYY-MM-DD' del instante dado, medido en Lima. Sirve para comparar días. */
export function diaEnLima(fecha: Date): string {
  return formateadorDia.format(fecha);
}
