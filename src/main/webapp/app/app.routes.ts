import { Routes } from '@angular/router';
import { Login } from './security/login/login';
import { LogoutFailed } from './security/logout-failed/logout-failed';
import { Register } from './security/register/register';
import { RegisterSuccess } from './security/register-success/register-success';

export const routes: Routes = [
  {
    title: 'Rezepte - Login',
    path: 'login',
    component: Login,
  },
  {
    title: 'Rezepte - Logout fehlgeschlagen',
    path: 'logout-failed',
    component: LogoutFailed,
  },
  {
    title: 'Rezepte - Registrieren',
    path: 'register',
    component: Register,
  },
  {
    title: 'Rezepte - Registrierung erfolgreich',
    path: 'register/success',
    component: RegisterSuccess,
  },
];
