import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { canActivateLoggedIn, canActivateAnketYonetimi, canActivateRaporlama } from './services/auth/auth-guard';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  // Eager Loaded Routes
  {
    path: 'login',
    component: Login,
    data: { showNavbar: false }
  },
  {
    path: '',
    component: Home,
    canActivate: [canActivateLoggedIn]
  },

  // Lazy Loaded Routes
  {
    path: 'profil',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
    canActivate: [canActivateLoggedIn]
  },
  {
    path: 'raporlar',
    loadComponent: () => import('./pages/reports/reports').then(m => m.Reports),
    canActivate: [canActivateRaporlama],
  },
  {
    path: 'anket-yonetimi',
    loadComponent: () => import('./pages/anket-yonetimi/anket-yonetimi').then(m => m.AnketYonetimi),
    canActivate: [canActivateAnketYonetimi]
  },
  {
    path: 'anket-detay/:id',
    loadComponent: () => import('./pages/anket-detay/anket-detay').then(m => m.AnketDetay),
    canActivate: [canActivateLoggedIn]
  },

  // Wildcard route
  { path: '**', component: NotFound }
];
