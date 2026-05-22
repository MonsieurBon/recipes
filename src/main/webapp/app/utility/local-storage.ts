import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorage {
  public setItem(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  public getItem(key: string): unknown {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  public removeItem(key: string) {
    localStorage.removeItem(key);
  }
}
