import { Injectable, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly htmlElement = this.document.documentElement;
  private readonly storageKey = 'billing-console-theme';

  readonly isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.isDarkMode());
    effect(() => {
      this.applyTheme(this.isDarkMode());
    });
  }

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  private getInitialTheme(): boolean {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private applyTheme(isDark: boolean): void {
    this.htmlElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
  }
}
