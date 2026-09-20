import { Injectable, signal } from '@angular/core';

export type ModalType = 'success' | 'info' | 'error' | 'confirm' | 'prompt';

export interface ModalRow {
  label: string;
  value: string;
}

export interface ModalConfig {
  type: ModalType;
  title: string;
  message?: string;
  rows?: ModalRow[];
  confirmDanger?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputMin?: number;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly config = signal<ModalConfig | null>(null);

  private resolver?: (value: string | null) => void;

  open(config: ModalConfig): Promise<string | null> {
    this.config.set(config);
    return new Promise(resolve => {
      this.resolver = resolve;
    });
  }

  confirm(value: string | null = 'ok') {
    this.config.set(null);
    this.resolver?.(value);
    this.resolver = undefined;
  }

  cancel() {
    this.config.set(null);
    this.resolver?.(null);
    this.resolver = undefined;
  }
}
