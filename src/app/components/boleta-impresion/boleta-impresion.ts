import { Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ImpresionService } from '../../services/impresion.service';

/**
 * Hoja de la boleta. Invisible en pantalla; es lo unico que se ve al imprimir
 * (ver las reglas @media print en styles.css).
 */
@Component({
  selector: 'app-boleta-impresion',
  templateUrl: './boleta-impresion.html',
  styleUrl: './boleta-impresion.css',
  imports: [DatePipe, DecimalPipe]
})
export class BoletaImpresion {
  private impresion = inject(ImpresionService);
  boleta = this.impresion.boleta;
}
