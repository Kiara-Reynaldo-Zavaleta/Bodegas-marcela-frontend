import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // La cabecera usa routerLink y los componentes de ruta inyectan HttpClient:
      // sin estos providers el arranque falla con NG0201 (ya ocurria antes).
      providers: [provideRouter(routes), provideHttpClient()]
    }).compileComponents();
  });

  it('se crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el enlace de salto al contenido', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const salto = fixture.nativeElement.querySelector('.skip-link');
    expect(salto?.textContent).toContain('Saltar al contenido');
  });

  it('la navegación incluye Inicio', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const enlaces: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.nav-links a') as NodeListOf<HTMLElement>
    ).map(a => (a.textContent ?? '').trim());
    expect(enlaces).toContain('Inicio');
  });
});
