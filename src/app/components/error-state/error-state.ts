import { Component, input, output } from '@angular/core';

/**
 * Estado de error de carga, con reintento.
 *
 * Existe para que una falla de conexion deje de disfrazarse de "no hay datos".
 * Antes, si la API no respondia, Inventario mostraba "Sin productos
 * encontrados", el Dashboard "Sin alertas de stock" y Reportes "Sin datos
 * disponibles": tres frases falsas, y la primera puede hacer creer que se
 * perdio el inventario. De ahi la linea explicita sobre que nada se borro.
 */
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.css'
})
export class ErrorState {
  titulo = input('No se pudo cargar la información');
  detalle = input('Revisa tu conexión a internet y vuelve a intentarlo. No se ha borrado nada.');
  /** Si no se escucha, no se muestra el boton. */
  reintentar = output<void>();
  mostrarReintento = input(true);
}
