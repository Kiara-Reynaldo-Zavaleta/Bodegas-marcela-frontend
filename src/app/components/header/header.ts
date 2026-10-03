import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.css',
  imports: [RouterLink, RouterLinkActive]
})
export class Header {
  private router = inject(Router);

  menuAbierto = signal(false);

  constructor() {
    // El menu movil tambien se cierra al navegar con atras/adelante del
    // navegador, no solo al pulsar un enlace.
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.menuAbierto.set(false));
  }

  toggleMenu() { this.menuAbierto.update(v => !v); }
  cerrarMenu() { this.menuAbierto.set(false); }
}
