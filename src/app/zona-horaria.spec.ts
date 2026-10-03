import { TestBed } from '@angular/core/testing';
import { DatePipe, DATE_PIPE_DEFAULT_OPTIONS, registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import localeEsPe from '@angular/common/locales/es-PE';
import { diaEnLima, OFFSET_BODEGA } from './zona-horaria';

registerLocaleData(localeEsPe);

describe('zona horaria del negocio', () => {
  // 21:53 del 2 de octubre en Lima = 02:53 del 3 de octubre en UTC.
  // Es el caso que rompe cualquier cálculo hecho con la zona del dispositivo.
  const ventaNocturna = new Date('2026-10-02T21:53:29-05:00');

  it('una venta de la noche pertenece al día de Lima, no al de UTC', () => {
    expect(ventaNocturna.toISOString()).toBe('2026-10-03T02:53:29.000Z');
    expect(diaEnLima(ventaNocturna)).toBe('2026-10-02');
  });

  it('el día no depende de la zona horaria del dispositivo', () => {
    // Mismo instante leído desde Madrid: allí ya es día 3.
    const enMadrid = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(ventaNocturna);

    expect(enMadrid).toBe('2026-10-03');
    expect(diaEnLima(ventaNocturna)).toBe('2026-10-02');
  });

  it('medianoche de Lima cae en el día correcto', () => {
    expect(diaEnLima(new Date('2026-10-02T00:00:00-05:00'))).toBe('2026-10-02');
    expect(diaEnLima(new Date('2026-10-02T23:59:59-05:00'))).toBe('2026-10-02');
    expect(diaEnLima(new Date('2026-10-03T00:00:01-05:00'))).toBe('2026-10-03');
  });
});

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
    // El mismo instante, expresado en UTC por el servidor.
    expect(pipe.transform('2026-10-03T02:53:29Z', 'dd/MM/yyyy HH:mm')).toBe('02/10/2026 21:53');
  });
});
