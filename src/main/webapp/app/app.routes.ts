import { Routes } from '@angular/router';
import { adminGuard } from './admin/admin-guard';
import { AdminShell } from './admin/admin-shell';
import { AdminUsers } from './admin/users/admin-users';
import { Konto } from './konto/konto';
import { loggedInGuard } from './security/logged-in-guard';
import { Login } from './security/login/login';
import { LogoutFailed } from './security/logout-failed/logout-failed';
import { Register } from './security/register/register';
import { RegisterSuccess } from './security/register-success/register-success';

// Route titles are translation keys; TranslatedTitleStrategy renders them as "{app name} - {page}"
// in the active language.
export const routes: Routes = [
  {
    title: 'app.account',
    path: 'konto',
    component: Konto,
    canActivate: [loggedInGuard],
  },
  {
    title: 'app.login',
    path: 'login',
    component: Login,
  },
  {
    title: 'logoutFailed.title',
    path: 'logout-failed',
    component: LogoutFailed,
  },
  {
    title: 'app.register',
    path: 'register',
    component: Register,
  },
  {
    title: 'registerSuccess.title',
    path: 'register/success',
    component: RegisterSuccess,
  },
  {
    title: 'app.administration',
    path: 'admin',
    component: AdminShell,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        title: 'admin.users',
        path: 'users',
        component: AdminUsers,
      },
      { path: '**', redirectTo: 'users' },
    ],
  },
];
