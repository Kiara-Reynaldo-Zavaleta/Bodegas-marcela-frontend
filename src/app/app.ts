import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Modal } from './components/modal/modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Modal],
  template: `
    <app-header />
    <router-outlet />
    <app-modal />
  `,
  styles: []
})
export class App {}
