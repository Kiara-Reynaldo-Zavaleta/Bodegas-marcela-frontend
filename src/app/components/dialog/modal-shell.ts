import { Directive, ElementRef, inject, output, OnDestroy, AfterViewInit } from '@angular/core';

/**
 * Comportamiento compartido por todos los dialogos de la app.
 *
 * Antes cada modal lo resolvia por su cuenta y ninguno lo hacia completo: los
 * cuatro modales locales no cerraban con Escape, ninguno movia el foco al
 * abrirse ni lo devolvia al cerrarse, ninguno atrapaba el Tab (se podia tabular
 * hacia la pagina de atras) y ninguno bloqueaba el scroll del fondo.
 *
 * Se aplica al elemento de la tarjeta, no al overlay.
 */

const SELECTOR_FOCO = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

/** Pila de dialogos abiertos: solo el de arriba responde a Escape. */
const pila: ModalShell[] = [];
let scrollBloqueadoPor = 0;
let overflowPrevio = '';

@Directive({
  selector: '[appModalShell]',
  host: {
    'role': 'dialog',
    'aria-modal': 'true',
    'tabindex': '-1'
  }
})
export class ModalShell implements AfterViewInit, OnDestroy {
  /** Escape en el dialogo de arriba. Cada modal decide si cierra, cancela o acepta. */
  escape = output<void>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private focoPrevio: HTMLElement | null = null;
  private onKeydown = (e: KeyboardEvent) => this.manejarTecla(e);

  ngAfterViewInit() {
    this.focoPrevio = document.activeElement as HTMLElement | null;
    pila.push(this);
    this.bloquearScroll();
    document.addEventListener('keydown', this.onKeydown, true);

    // El contenido puede montarse en este mismo tick (@if dentro del dialogo),
    // asi que el foco se mueve despues.
    setTimeout(() => {
      const destino = this.focusables()[0] ?? this.host.nativeElement;
      destino.focus();
    });
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.onKeydown, true);
    const i = pila.indexOf(this);
    if (i > -1) pila.splice(i, 1);
    this.liberarScroll();
    // Devuelve el foco a lo que lo tenia antes de abrir (la fila, el boton...).
    if (this.focoPrevio?.isConnected) this.focoPrevio.focus();
  }

  private manejarTecla(e: KeyboardEvent) {
    if (pila[pila.length - 1] !== this) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.escape.emit();
      return;
    }

    if (e.key !== 'Tab') return;

    const f = this.focusables();
    if (!f.length) {
      e.preventDefault();
      this.host.nativeElement.focus();
      return;
    }

    const primero = f[0];
    const ultimo = f[f.length - 1];
    const activo = document.activeElement;
    const dentro = this.host.nativeElement.contains(activo);

    if (!dentro) {
      e.preventDefault();
      (e.shiftKey ? ultimo : primero).focus();
    } else if (e.shiftKey && activo === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  private focusables(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(SELECTOR_FOCO)
    ).filter(el => el.offsetParent !== null || el === document.activeElement);
  }

  private bloquearScroll() {
    if (scrollBloqueadoPor === 0) {
      overflowPrevio = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollBloqueadoPor++;
  }

  private liberarScroll() {
    scrollBloqueadoPor = Math.max(0, scrollBloqueadoPor - 1);
    if (scrollBloqueadoPor === 0) document.body.style.overflow = overflowPrevio;
  }
}
