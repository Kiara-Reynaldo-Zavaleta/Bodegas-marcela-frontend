import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Ventas } from './components/ventas/ventas';
import { Inventario } from './components/inventario/inventario';
import { Reportes } from './components/reportes/reportes';
import { CuentasCobrar } from './components/cuentas-cobrar/cuentas-cobrar';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'ventas', component: Ventas },
  { path: 'inventario', component: Inventario },
  { path: 'reportes', component: Reportes },
  { path: 'cobrar', component: CuentasCobrar },
  { path: '**', redirectTo: '' }
];
