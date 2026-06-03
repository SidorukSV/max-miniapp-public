const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "max:"]);

function startsWithControlCharacter(value) {
    if (!value) return false;
    const code = value.charCodeAt(0);
    return code <= 31 || code === 127;
}

export function getSafeExternalUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) return null;

    if (startsWithControlCharacter(value)) return null;

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
