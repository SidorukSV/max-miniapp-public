import { appConfig } from "./config.js";

const COLOR_VARIABLES = {
  background: "--bg",
  surface: "--surface",
  surfaceSoft: "--surface-soft",
  text: "--text",
  muted: "--muted",
  mutedStrong: "--muted-strong",
  accent: "--accent",
  accentDark: "--accent-dark",
  accentSoft: "--accent-soft",
  accentTint: "--accent-tint",
  border: "--border",
  success: "--success",
  danger: "--danger",
  warning: "--warning",
};

function applyColors(colors) {
  if (!colors || typeof colors !== "object") return;

  for (const [key, value] of Object.entries(colors)) {
    const cssVar = COLOR_VARIABLES[key];
    if (!cssVar || typeof value !== "string" || !value.trim()) continue;
    document.documentElement.style.setProperty(cssVar, value.trim());
  }
}

function resolveThemeConfigUrl(rawPath) {
  const value = String(rawPath || "theme-config.json").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return value;

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = value.replace(/^\.?\//, "");

  return `${normalizedBase}${normalizedPath}`;
}

export async function applyRuntimeTheme() {
  try {
    const themeConfigUrl = resolveThemeConfigUrl(appConfig.themeConfigPath);
    if (!themeConfigUrl) return;

    const response = await fetch(themeConfigUrl, {
      cache: "no-store",
    });

    if (!response.ok) return;

    const config = await response.json();
    applyColors(config?.colors);
  } catch {
    // The bundled CSS variables are the safe fallback.
  }
}
