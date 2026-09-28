import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly STORAGE_KEY = 'redplus_theme_preference';

    theme = signal<Theme>(this.getInitialTheme());

    constructor() {

        effect(() => {
            const currentTheme = this.theme();
            localStorage.setItem(this.STORAGE_KEY, currentTheme);
            this.applyTheme(currentTheme);
        });
    }

    toggleTheme(): void {
        this.theme.update(current => current === 'dark' ? 'light' : 'dark');
    }

    setTheme(newTheme: Theme): void {
        this.theme.set(newTheme);
    }

    get isDarkMode(): boolean {
        return this.theme() === 'dark';
    }

    private getInitialTheme(): Theme {
        const saved = localStorage.getItem(this.STORAGE_KEY) as Theme;
        if (saved) return saved;

        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    private applyTheme(theme: Theme): void {
        document.body.setAttribute('data-theme', theme);

        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}
