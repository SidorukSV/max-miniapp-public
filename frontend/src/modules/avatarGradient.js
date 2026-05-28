export function getFallbackGradientByInitials(initials, seed = "") {
  const gradients = ["red", "orange", "green", "blue", "purple"];

  const normalized = initials
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/Ё/g, "Е");

  let hash = 0;

  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  const normalizedSeed = String(seed).trim();
  for (let i = 0; i < normalizedSeed.length; i++) {
    hash = (hash * 37 + normalizedSeed.charCodeAt(i)) >>> 0;
  }

  return gradients[hash % gradients.length];
}
