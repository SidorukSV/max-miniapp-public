export const DEFAULT_VISIBILITY_PAGES = Object.freeze({
  bonuses: true,
  survey: true,
});

export function isPageVisible(profile, page) {
  const configuredValue = profile?.visibility_pages?.[page];
  return typeof configuredValue === "boolean"
    ? configuredValue
    : DEFAULT_VISIBILITY_PAGES[page] !== false;
}
