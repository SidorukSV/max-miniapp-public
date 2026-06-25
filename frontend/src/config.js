export const appConfig = {
  privacyPolicyUrl: import.meta.env.VITE_PRIVACY_POLICY_URL || "",
  personalDataConsentUrl: import.meta.env.VITE_PERSONAL_DATA_CONSENT_URL || "",
  communnicationConsentUrl: import.meta.env.VITE_COMMUNICATION_CONSENT_URL || "",
  themeConfigPath: import.meta.env.VITE_THEME_CONFIG_PATH || "theme-config.json",
};
