import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Boleta } from '../../models/boleta.model';
import { mensajeDeError } from '../../errores';
import { ZONA_BODEGA } from '../../zona-horaria';
import { ErrorState } from '../error-state/error-state';

@Component({
  selector: 'app-cuentas-cobrar',
  templateUrl: './cuentas-cobrar.html',
  styleUrl: './cuentas-cobrar.css',
  imports: [DatePipe, DecimalPipe, ErrorState]
})
export class CuentasCobrar implements OnInit {
  private api = inject(ApiService);
  private modal = inject(ModalService);

  boletas    = signal<Boleta[]>([]);
  cargando   = signal(true);
  errorCarga = signal(false);
  procesando = signal<number | null>(null);

  totalPendiente = computed(() =>
    this.boletas().reduce((acc, b) => acc + b.total, 0)
  );

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.api.getBoletasFiado().subscribe({
      next: data => {
        this.boletas.set([...data].sort((a, b) => a.id - b.id));
        this.cargando.set(false);
      },
      // Antes esto mostraba "No hay cuentas pendientes de cobro": justo lo
      // contrario de lo que conviene creer cuando no se sabe nada.
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set(true);
      }
    });
  }

  async marcarPagado(boleta: Boleta) {
    const ok = await this.modal.open({
      type: 'confirm',
      title: '¿Confirmar que ya pagó?',
      rows: [
        { label: 'Cliente',       value: boleta.clienteNombre || 'Cliente varios' },
        { label: 'DNI',           value: boleta.clienteDni || '—' },
        { label: 'Monto a cobrar', value: `S/ ${boleta.total.toFixed(2)}` },
        { label: 'Fecha de la venta', value: new Date(boleta.fecha).toLocaleDateString('es-PE', { timeZone: ZONA_BODEGA }) }
      ],
      message: 'La deuda se marcará como cobrada y entrará en la caja de hoy.',
      confirmLabel: 'Sí, ya pagó',
      cancelLabel: 'Cancelar'
    });
    if (!ok) return;

    this.procesando.set(boleta.id);
    this.api.marcarPagado(boleta.id).subscribe({
      next: () => {
        this.procesando.set(null);
        this.boletas.update(list => list.filter(b => b.id !== boleta.id));
      },
      // El error solo reseteaba el boton: la fila seguia ahi y nada explicaba
      // por que, asi que parecia que el cobro no se habia registrado... o si.
      error: err => {
        this.procesando.set(null);
        this.modal.alertarError(
          'No se pudo registrar el pago',
          mensajeDeError(err, 'registrar el pago') +
            ` La deuda de ${boleta.clienteNombre || 'este cliente'} sigue pendiente.`
        );
      }
    });
  }
}
