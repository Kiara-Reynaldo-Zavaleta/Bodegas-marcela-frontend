import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { DATE_PIPE_DEFAULT_OPTIONS, registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { routes } from './app.routes';
import { OFFSET_BODEGA } from './zona-horaria';

// Angular solo trae datos de en-US. Sin esto, `| date:'EEEE d MMMM'` del panel
// imprimía "Friday 2 de October" en lugar de "viernes 2 de octubre".
registerLocaleData(localeEsPe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    // Toda fecha mostrada se renderiza en hora de Lima, sea cual sea la zona
    // horaria del dispositivo. Evita tener que repetir el offset en cada | date.
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: OFFSET_BODEGA } }
  ]
};
