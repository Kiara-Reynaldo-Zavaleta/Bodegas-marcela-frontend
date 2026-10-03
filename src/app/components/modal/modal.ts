import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ModalService } from '../../services/modal.service';
import { ModalShell } from '../dialog/modal-shell';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  imports: [FormsModule, NgClass, ModalShell]
})
export class Modal {
  readonly modal = inject(ModalService);

  inputValue = '';
  errorInput = signal('');

  get config() {
    return this.modal.config();
  }

  get esCancelable(): boolean {
    return this.config?.type === 'prompt'
        || this.config?.type === 'confirm'
        || !!this.config?.cancelLabel;
  }

  /** Escape y clic fuera: cancelan si hay que decidir, cierran si es un aviso. */
  alSalir() {
    if (!this.config) return;
    this.esCancelable ? this.cancelModal() : this.confirmModal();
  }

  clickOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.alSalir();
    }
  }

  confirmModal() {
    if (this.config?.type === 'prompt' && !this.validarInput()) return;
    const value = this.config?.type === 'prompt' ? this.inputValue : 'ok';
    this.limpiar();
    this.modal.confirm(value || null);
  }

  cancelModal() {
    this.limpiar();
    this.modal.cancel();
  }

  /**
   * Antes, confirmar con el campo vacio cerraba el modal y el llamador hacia
   * `return` en silencio: la usuaria pulsaba "Añadir" y no pasaba nada, sin
   * explicacion. Ahora el modal no se cierra y dice que falta.
   */
  private validarInput(): boolean {
    const bruto = this.inputValue.trim();
    const min = this.config?.inputMin ?? 1;

    if (!bruto) {
      this.errorInput.set('Escribe una cantidad para continuar.');
      return false;
    }
    const n = Number(bruto);
    if (!Number.isFinite(n)) {
      this.errorInput.set('Escribe solo números.');
      return false;
    }
    if (n < min) {
      this.errorInput.set(`La cantidad debe ser ${min} o más.`);
      return false;
    }
    this.errorInput.set('');
    return true;
  }

  alEscribir() {
    if (this.errorInput()) this.errorInput.set('');
  }

  private limpiar() {
    this.inputValue = '';
    this.errorInput.set('');
  }

  get confirmClass(): string {
    if (this.config?.type === 'info') return 'btn-secondary';
    if (this.config?.confirmDanger) return 'btn-danger';
    return 'btn-primary';
  }
}
