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
  /** Linea destacada para acciones irreversibles ("no se puede deshacer"). */
  advertencia?: string;
  confirmDanger?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputMin?: number;
  /** Sufijo del campo numerico, p. ej. "unidades". */
  inputSufijo?: string;
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

  /**
   * Aviso de que una accion fallo. Se usa en lugar de dejar el error en la
   * consola: si "Añadir stock" no se guardo, la usuaria tiene que enterarse,
   * porque si no vuelve a pulsar y duplica, o cree que si se guardo.
   */
  alertarError(title: string, message: string): Promise<string | null> {
    return this.open({ type: 'error', title, message, confirmLabel: 'Entendido' });
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
