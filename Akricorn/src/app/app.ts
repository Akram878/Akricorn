import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from './LayoutComponent/Layout.component';
import { Auth } from './auth/auth.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LayoutComponent, Auth], // ✅ أضفنا RouterOutlet
  templateUrl: './app.html',
  styleUrls: ['./app.scss'], // ✅ صححت من styleUrl إلى styleUrls
})
export class App {
  protected readonly title = signal('Akricorn');
}
