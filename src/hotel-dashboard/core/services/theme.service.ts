import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  THEMES,
  ThemeDefinition,
  ThemePalette,
} from "../models/theme.constants";

export type ThemeMode = "light" | "dark";

const THEME_KEY = "revelton_hotel_theme";
const MODE_KEY = "revelton_hotel_mode";
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

  /** Switch to a named theme (e.g. 'Revelton', 'Midnight') */
  setTheme(themeName: string): void {
    const found = THEMES.find((t) => t.name === themeName);
    if (found) {
      this._theme$.next(found);
      this.save(THEME_KEY, themeName);
      this.applyTheme();
    }
  }

  /** Switch between 'light' and 'dark' */
  setMode(mode: ThemeMode): void {
    this._mode$.next(mode);
    this.save(MODE_KEY, mode);
    this.applyTheme();
  }

  private save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Failed to save theme to storage", e);
    }
  }

  /** Toggle between light and dark */
  toggleMode(): void {
    this.setMode(this._mode$.value === "dark" ? "light" : "dark");
  }

  /**
   * Map the selected theme constants to CSS variables on one element, or on
   * every attached host when no target is given.
   */
  public applyTheme(target?: HTMLElement): void {
    if (target) {
      this.paint(target);
    } else {
      this.hosts.forEach((host) => this.paint(host));
    }
  }

  private paint(target: HTMLElement): void {
    const theme = this._theme$.value;
    const palette: ThemePalette =
      this._mode$.value === "dark" ? theme.dark : theme.light;
    const root = target.style;

    // ── Surface tokens ───────────────────────────────────────────
    root.setProperty("--bg", palette.bg);
    root.setProperty("--panel", palette.panel);
    root.setProperty("--panel2", palette.panel2 ?? palette.panel);
    root.setProperty("--inner", palette.inner ?? palette.card);
    root.setProperty("--card", palette.card);
    root.setProperty("--border", palette.border);

    // ── Accent ──────────────────────────────────────────────────
    root.setProperty("--accent", palette.accent);
    root.setProperty("--accent-soft", palette.accentSoft ?? palette.accentMuted);
    root.setProperty("--accent-muted", palette.accentMuted);

    // ── Text hierarchy (new token names) ─────────────────────────
    root.setProperty("--tx", palette.tx ?? palette.text);
    root.setProperty("--t2", palette.t2 ?? palette.textSecondary);
    root.setProperty("--t3", palette.t3 ?? palette.textMuted);

    // ── Text hierarchy (legacy token names) ──────────────────────
    root.setProperty("--text", palette.text);
    root.setProperty("--text-secondary", palette.textSecondary);
    root.setProperty("--text-muted", palette.textMuted);

    // ── Semantic colors (new token names) ────────────────────────
    root.setProperty("--ok", palette.ok ?? palette.success);
    root.setProperty("--ok-soft", palette.okSoft ?? palette.successBg);
    root.setProperty("--warn", palette.warn ?? palette.warning);
    root.setProperty("--warn-soft", palette.warnSoft ?? palette.warningBg);
    root.setProperty("--alert", palette.alert ?? palette.danger);
    root.setProperty("--alert-soft", palette.alertSoft ?? palette.dangerBg);
    root.setProperty("--ring-track", palette.ringTrack ?? palette.border);

    // ── Semantic colors (legacy token names) ─────────────────────
    root.setProperty("--success", palette.success);
    root.setProperty("--success-bg", palette.successBg);
    root.setProperty("--warning", palette.warning);
    root.setProperty("--warning-bg", palette.warningBg);
    root.setProperty("--danger", palette.danger);
    root.setProperty("--danger-bg", palette.dangerBg);
    root.setProperty("--info", palette.info);

    // Convenience: data attributes for CSS selectors
    target.setAttribute("data-theme", theme.name.toLowerCase());
    target.setAttribute("data-mode", this._mode$.value);
  }
}
