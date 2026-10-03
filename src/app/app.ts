import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Modal } from './components/modal/modal';
import { BoletaImpresion } from './components/boleta-impresion/boleta-impresion';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Modal, BoletaImpresion],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>

    <app-header class="no-imprimir" />

    <main id="contenido" class="contenido-app" tabindex="-1">
      <router-outlet />
    </main>

    <app-modal class="no-imprimir" />

    <!-- Fuera de .contenido-app a proposito: al imprimir se oculta todo lo
         demas y queda solo la hoja de la boleta. -->
    <app-boleta-impresion />
  `,
  styles: []
})
export class App {}
