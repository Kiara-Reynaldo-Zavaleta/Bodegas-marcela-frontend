import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ModalService } from '../../services/modal.service';
import { Boleta } from '../../models/boleta.model';

@Component({
  selector: 'app-cuentas-cobrar',
  templateUrl: './cuentas-cobrar.html',
  styleUrl: './cuentas-cobrar.css',
  imports: [DatePipe, DecimalPipe]
})
export class CuentasCobrar implements OnInit {
  private api = inject(ApiService);
  private modal = inject(ModalService);

  boletas    = signal<Boleta[]>([]);
  loading    = signal(true);
  procesando = signal<number | null>(null);

  totalPendiente = computed(() =>
    this.boletas().reduce((acc, b) => acc + b.total, 0)
  );

  ngOnInit() {
    this.cargar();
  }

  private cargar() {
    this.api.getBoletasFiado().subscribe({
      next: data => {
        this.boletas.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  async marcarPagado(boleta: Boleta) {
    const resultado = await this.modal.open({
      type: 'confirm',
      title: '¿Confirmar pago?',
      rows: [
        { label: 'Cliente', value: boleta.clienteNombre },
        { label: 'DNI',     value: boleta.clienteDni || '-' },
        { label: 'Total',   value: `S/ ${boleta.total.toFixed(2)}` },
        { label: 'Fecha',   value: new Date(boleta.fecha).toLocaleDateString('es-PE') }
      ],
      confirmLabel: 'Confirmar pago',
      cancelLabel: 'Cancelar'
    });

    if (!resultado) return;

    this.procesando.set(boleta.id);
    this.api.marcarPagado(boleta.id).subscribe({
      next: () => {
        this.procesando.set(null);
        this.boletas.update(list => list.filter(b => b.id !== boleta.id));
      },
      error: () => this.procesando.set(null)
    });
  }
}
