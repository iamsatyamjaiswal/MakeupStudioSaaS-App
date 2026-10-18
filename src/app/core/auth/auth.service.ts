import { Injectable, computed, signal } from '@angular/core';
import { ApiService, LoginResponse } from '../../api.service';

const TOKEN_KEY = 'makeupstudio.accessToken';
const USER_KEY = 'makeupstudio.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserState = signal<LoginResponse['user'] | null>(this.readUser());
  readonly user = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.token && !!this.currentUserState());
  get token(): string | null { return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY); }
  get roles(): string[] { return this.currentUserState()?.roles ?? []; }
  hasRole(role: string): boolean { return this.roles.includes(role); }
  constructor(private api: ApiService) {}
  login(email: string, password: string) { return this.api.login(email, password); }
  saveSession(result: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    this.currentUserState.set(result.user);
  }
  logout(): void { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); this.currentUserState.set(null); }
  private readUser(): LoginResponse['user'] | null {
    try { return typeof localStorage === 'undefined' ? null : JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'); }
    catch { return null; }
  }
}
