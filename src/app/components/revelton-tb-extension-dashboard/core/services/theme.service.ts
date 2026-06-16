import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  THEMES,
  ThemeDefinition,
  ThemePalette,
} from "../models/theme.constants";

export type ThemeMode = "light" | "dark";

@Injectable({ providedIn: "root" })
export class ThemeService {
  private _theme$ = new BehaviorSubject<ThemeDefinition>(THEMES[0]);
  private _mode$ = new BehaviorSubject<ThemeMode>("light");

  /** Observable of the active theme definition */
  readonly theme$ = this._theme$.asObservable();

  /** Observable of the active mode ('light' | 'dark') */
  readonly mode$ = this._mode$.asObservable();

  /** All available themes */
  readonly themes = THEMES;

  constructor() {
    this.loadFromStorage();
    this.applyTheme();
  }

  private loadFromStorage(): void {
    try {
      const savedTheme = localStorage.getItem("revelton_theme");
      const savedMode = localStorage.getItem("revelton_mode") as ThemeMode;

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

  /** Switch to a named theme (e.g. 'Midnight', 'Ocean') */
  setTheme(themeName: string): void {
    const found = THEMES.find((t) => t.name === themeName);
    if (found) {
      this._theme$.next(found);
      localStorage.setItem("revelton_theme", themeName);
      this.applyTheme();
    }
  }

  /** Switch between 'light' and 'dark' */
  setMode(mode: ThemeMode): void {
    this._mode$.next(mode);
    localStorage.setItem("revelton_mode", mode);
    this.applyTheme();
  }

  /** Toggle between light and dark */
  toggleMode(): void {
    this.setMode(this._mode$.value === "dark" ? "light" : "dark");
  }

  /**
   * Map the selected theme constants to CSS variables and inject them
   * globally using document.documentElement.style.setProperty().
   */
  public applyTheme(target?: HTMLElement): void {
    const theme = this._theme$.value;
    const palette: ThemePalette =
      this._mode$.value === "dark" ? theme.dark : theme.light;
    const root = target ? target.style : document.documentElement.style;

    // Core layout colors
    root.setProperty("--bg", palette.bg);
    root.setProperty("--panel", palette.panel);
    root.setProperty("--card", palette.card);
    root.setProperty("--border", palette.border);
    root.setProperty("--accent", palette.accent);
    root.setProperty("--accent-muted", palette.accentMuted);

    // Text hierarchy
    root.setProperty("--text", palette.text);
    root.setProperty("--text-secondary", palette.textSecondary);
    root.setProperty("--text-muted", palette.textMuted);

    // Semantic colors
    root.setProperty("--success", palette.success);
    root.setProperty("--success-bg", palette.successBg);
    root.setProperty("--warning", palette.warning);
    root.setProperty("--warning-bg", palette.warningBg);
    root.setProperty("--danger", palette.danger);
    root.setProperty("--danger-bg", palette.dangerBg);
    root.setProperty("--info", palette.info);

    // Convenience: set a data attribute for CSS selectors
    if (target) {
      target.setAttribute("data-theme", theme.name.toLowerCase());
      target.setAttribute("data-mode", this._mode$.value);
    } else {
      document.documentElement.setAttribute(
        "data-theme",
        theme.name.toLowerCase()
      );
      document.documentElement.setAttribute("data-mode", this._mode$.value);
    }
  }
}
