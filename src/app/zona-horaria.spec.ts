import { TestBed } from '@angular/core/testing';
import { DatePipe, DATE_PIPE_DEFAULT_OPTIONS, registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import localeEsPe from '@angular/common/locales/es-PE';
import { OFFSET_BODEGA } from './zona-horaria';

registerLocaleData(localeEsPe);

// Qué día es "hoy" lo resuelve el backend. Lo que queda del lado del navegador
// es mostrar bien las fechas que llegan, y eso es lo que se prueba aquí.
describe('DatePipe configurado para la bodega', () => {
  let pipe: DatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DatePipe,
        { provide: LOCALE_ID, useValue: 'es-PE' },
        { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: OFFSET_BODEGA } }
      ]
    });
    pipe = TestBed.inject(DatePipe);
  });

  it('escribe los días y meses en español', () => {
    // Sin registrar el locale, Angular imprimía "Friday 2 de October".
    const texto = pipe.transform('2026-10-02T21:53:29-05:00', "EEEE d 'de' MMMM");
    expect(texto).toBe('viernes 2 de octubre');
  });

  it('muestra la hora de Lima aunque el dato venga en otro offset', () => {
    // Mismo instante expresado en UTC: 02:53 del día 3 en UTC son las 21:53
    // del día 2 en Lima. Sin el offset configurado, un navegador fuera de Perú
    // mostraría el día equivocado.
    expect(pipe.transform('2026-10-03T02:53:29Z', 'dd/MM/yyyy HH:mm')).toBe('02/10/2026 21:53');
  });

  it('respeta el offset que ya trae el backend', () => {
    expect(pipe.transform('2026-10-02T21:53:29-05:00', 'dd/MM/yyyy HH:mm')).toBe('02/10/2026 21:53');
  });
});
