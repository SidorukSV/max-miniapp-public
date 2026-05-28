const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "max:"]);

export function getSafeExternalUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) return null;

    if (/^[\u0000-\u001F\u007F]/.test(value)) return null;

    try {
        const parsed = new URL(value, window.location.origin);
        if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

export function openExternalLink(rawUrl) {
    const safeUrl = getSafeExternalUrl(rawUrl);
    if (!safeUrl) return false;

    const webApp = window.WebApp;
    if (webApp?.version) {
        webApp.openLink(safeUrl);
        return true;
    }

    window.location.href = safeUrl;
    return true;
}
