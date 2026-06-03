export const FRONTEND_BUILD = {
  appVersion: import.meta.env.VITE_APP_VERSION || "0.0.0",
  gitCommit: import.meta.env.VITE_GIT_COMMIT || "unknown",
  buildTime: import.meta.env.VITE_BUILD_TIME || "unknown",
};
