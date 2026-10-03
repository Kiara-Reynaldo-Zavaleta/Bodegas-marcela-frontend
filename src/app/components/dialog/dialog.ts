import { Component, input, output } from '@angular/core';
import { ModalShell } from './modal-shell';

let secuencia = 0;

/**
 * Carcasa para los dialogos con contenido propio (detalle de boleta, alta y
 * edicion de producto). Reemplaza las cuatro implementaciones a mano que
 * duplicaban overlay, tarjeta, cabecera y boton de cierre en tres archivos CSS.
 *
 * El comportamiento (Escape, foco, scroll) lo aporta ModalShell.
 */
@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.css',
  imports: [ModalShell]
})
export class Dialog {
  titulo = input.required<string>();
  /** 'sm' para formularios, 'md' para tablas de detalle. */
  tamano = input<'sm' | 'md'>('md');
  cerrar = output<void>();

  readonly tituloId = `dialogo-titulo-${++secuencia}`;

  alClicOverlay(event: MouseEvent) {
    const el = event.target as HTMLElement;
    if (el.classList.contains('dialog-overlay')) this.cerrar.emit();
  }
}
