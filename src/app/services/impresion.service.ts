import { Injectable, signal } from '@angular/core';
import { Boleta } from '../models/boleta.model';

/**
 * Impresion de boletas.
 *
 * La app se llamaba "sistema de boletas" pero no habia forma de sacar la boleta
 * del celular: ni imprimir, ni guardar en PDF, ni nada que entregarle al
 * cliente. Esto monta una hoja imprimible fuera de la ruta activa y dispara el
 * dialogo del navegador (que en movil incluye "Guardar como PDF" y compartir).
 */
@Injectable({ providedIn: 'root' })
export class ImpresionService {
  readonly boleta = signal<Boleta | null>(null);

  imprimir(boleta: Boleta) {
    this.boleta.set(boleta);

    const limpiar = () => {
      this.boleta.set(null);
      window.removeEventListener('afterprint', limpiar);
    };
    window.addEventListener('afterprint', limpiar);

    // Un tick para que Angular pinte la hoja antes de abrir el dialogo.
    setTimeout(() => window.print());
  }
}
