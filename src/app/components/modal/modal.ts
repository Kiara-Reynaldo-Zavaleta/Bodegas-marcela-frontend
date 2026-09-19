import { Component, inject, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  imports: [FormsModule, NgClass]
})
export class Modal {
  readonly modal = inject(ModalService);

  inputValue = '';

  get config() {
    return this.modal.config();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (!this.config) return;
    this.config.type === 'prompt' ? this.cancelModal() : this.confirmModal();
  }

  clickOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.config?.type === 'prompt' ? this.cancelModal() : this.confirmModal();
    }
  }

  confirmModal() {
    const value = this.config?.type === 'prompt' ? this.inputValue : 'ok';
    this.inputValue = '';
    this.modal.confirm(value || null);
  }

  cancelModal() {
    this.inputValue = '';
    this.modal.cancel();
  }

  get confirmClass(): string {
    return this.config?.type === 'info' ? 'btn-secondary' : 'btn-primary';
  }
}
