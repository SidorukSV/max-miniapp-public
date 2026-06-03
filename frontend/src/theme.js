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

export async function applyRuntimeTheme() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}theme-config.json`, {
      cache: "no-store",
    });

    if (!response.ok) return;

    const config = await response.json();
    applyColors(config?.colors);
  } catch {
    // The bundled CSS variables are the safe fallback.
  }
}
