import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Ventas } from './components/ventas/ventas';
import { Inventario } from './components/inventario/inventario';
import { Reportes } from './components/reportes/reportes';
import { CuentasCobrar } from './components/cuentas-cobrar/cuentas-cobrar';

// El title era fijo ("Bodegas Marcela") en las cinco rutas: con lector de
// pantalla no habia forma de saber a donde se habia navegado.
export const routes: Routes = [
  { path: '',            component: Dashboard,     title: 'Inicio · Bodegas Marcela' },
  { path: 'ventas',      component: Ventas,        title: 'Ventas · Bodegas Marcela' },
  { path: 'inventario',  component: Inventario,    title: 'Inventario · Bodegas Marcela' },
  { path: 'reportes',    component: Reportes,      title: 'Reportes · Bodegas Marcela' },
  { path: 'cobrar',      component: CuentasCobrar, title: 'Cuentas por cobrar · Bodegas Marcela' },
  { path: '**', redirectTo: '' }
];
