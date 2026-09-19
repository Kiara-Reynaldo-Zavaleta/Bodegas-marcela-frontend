import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { Ventas } from './components/ventas/ventas';
import { Inventario } from './components/inventario/inventario';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'ventas', component: Ventas },
  { path: 'inventario', component: Inventario },
  { path: '**', redirectTo: '' }
];
