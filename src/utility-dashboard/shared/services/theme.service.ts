import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  THEMES,
  ThemeDefinition,
  ThemePalette,
} from "../models/theme.constants";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "revelton_utility_theme";
const MODE_KEY = "revelton_utility_mode";
// Before the bundles were separated all three shared these keys; still read as a fallback so a saved choice survives.
const LEGACY_THEME_KEY = "revelton_theme";
const LEGACY_MODE_KEY = "revelton_mode";

@Injectable({ providedIn: "root" })
export class ThemeService {
  private _theme$ = new BehaviorSubject<ThemeDefinition>(THEMES.find(t => t.name === 'Revelton') || THEMES[0]);
  private _mode$ = new BehaviorSubject<ThemeMode>("dark");

  /** Observable of the active theme definition */
  readonly theme$ = this._theme$.asObservable();

  /** Observable of the active mode ('light' | 'dark') */
  readonly mode$ = this._mode$.asObservable();

  /** All available themes */
  readonly themes = THEMES;

  /** Widget hosts (and dialog panes) painted with the active theme; nothing is ever written to <html> or <body>. */
  private hosts = new Set<HTMLElement>();

  constructor() {
    this.loadFromStorage();
  }

  /** Paint the active theme onto a widget host and keep it in sync until the returned function is called. */
  attach(host: HTMLElement): () => void {
    this.hosts.add(host);
    this.applyTheme(host);
    return () => {
      this.hosts.delete(host);
    };
  }

  private loadFromStorage(): void {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) ?? localStorage.getItem(LEGACY_THEME_KEY);
      const savedMode = (localStorage.getItem(MODE_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY)) as ThemeMode;

      if (savedTheme) {
        const found = THEMES.find((t) => t.name === savedTheme);
        if (found) this._theme$.next(found);
      }
      if (savedMode === "light" || savedMode === "dark") {
        this._mode$.next(savedMode);
      }
    } catch (e) {
      console.warn("Failed to load theme from storage", e);
    }
  }

  /** Get the currently active theme name */
  get activeThemeName(): string {
    return this._theme$.value.name;
  }

  /** Get the currently active mode */
  get activeMode(): ThemeMode {
    return this._mode$.value;
  }

  /** Get the active theme's swatch color */
  get activeSwatch(): string {
    return this._theme$.value.swatch;
  }

  /** Switch theme by name */
  setTheme(name: string): void {
    const found = THEMES.find((t) => t.name === name);
    if (!found) return;

    this._theme$.next(found);
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch (e) {
      console.warn("Failed to save theme to storage", e);
    }
    this.applyTheme();
  }

  /** Switch mode ('light' | 'dark') */
  setMode(mode: ThemeMode): void {
    this._mode$.next(mode);
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch (e) {
      console.warn("Failed to save mode to storage", e);
    }
    this.applyTheme();
  }

  /** Toggle between light and dark mode */
  toggleMode(): void {
    this.setMode(this.activeMode === "dark" ? "light" : "dark");
  }

  /**
   * Apply the current theme to one element, or to every attached host when no
   * target is given.
   */
  applyTheme(target?: HTMLElement): void {
    if (target) {
      this.paint(target);
    } else {
      this.hosts.forEach((host) => this.paint(host));
    }
  }

  private paint(target: HTMLElement): void {
    const theme = this._theme$.value;
    const mode = this._mode$.value;
    const palette = mode === "dark" ? theme.dark : theme.light;

    target.setAttribute("data-mode", mode);

    // Map all palette colors to CSS variables
    const vars: Record<string, string> = {
      "--bg": palette.bg,
      "--panel": palette.panel,
      "--panel2": palette.panel2,
      "--inner": palette.inner,
      "--card": palette.card,
      "--border": palette.border,
      "--accent": palette.accent,
      "--accent-soft": palette.accentSoft,
      "--accent-muted": palette.accentMuted,
      "--tx": palette.tx,
      "--t2": palette.t2,
      "--t3": palette.t3,
      "--text": palette.text,
      "--text-secondary": palette.textSecondary,
      "--text-muted": palette.textMuted,
      "--ok": palette.ok,
      "--ok-soft": palette.okSoft,
      "--warn": palette.warn,
      "--warn-soft": palette.warnSoft,
      "--alert": palette.alert,
      "--alert-soft": palette.alertSoft,
      "--ring-track": palette.ringTrack,
      "--success": palette.success,
      "--success-bg": palette.successBg,
      "--warning": palette.warning,
      "--warning-bg": palette.warningBg,
      "--danger": palette.danger,
      "--danger-bg": palette.dangerBg,
      "--info": palette.info,
    };

    Object.entries(vars).forEach(([key, val]) => {
      target.style.setProperty(key, val);
    });
  }

  /** Get active palette directly (snapshot) */
  get currentPalette(): ThemePalette {
    const theme = this._theme$.value;
    return this._mode$.value === "dark" ? theme.dark : theme.light;
  }
}
