const REFRESH_TOKEN_KEY = "max_refresh_token";
let hasReportedSecureStorageUnavailable = false;

function getWebApp() {
    return window.WebApp || null;
}

export function isMaxMobilePlatform() {
    const platform = getWebApp()?.platform;
    return platform === "android" || platform === "ios";
}

function getSecureStorageApi() {
    const webApp = getWebApp();
    return webApp?.SecureStorage || window.SecureStorage || null;
}

function reportSecureStorageUnavailable() {
    if (hasReportedSecureStorageUnavailable) {
        return;
    }

    hasReportedSecureStorageUnavailable = true;

    const metric = {
        source: "maxSecureStorage",
        state: "secure_storage_unavailable",
        platform: getWebApp()?.platform || "unknown",
    };

    console.warn("[auth] secure storage unavailable", metric);

    window.dispatchEvent(
        new CustomEvent("max:secure-storage-unavailable", {
            detail: metric,
        }),
    );
}

function getSecureStorageMethod(method) {
    const api = getSecureStorageApi();
    const fn = api?.[method];

    if (typeof fn !== "function") {
        reportSecureStorageUnavailable();
        return null;
    }

    return { api, fn };
}

function callSecureStorage(method, key, value) {
    const secureStorageMethod = getSecureStorageMethod(method);
    if (!secureStorageMethod) {
        return Promise.resolve(null);
    }

    const { api, fn } = secureStorageMethod;

    try {
        const result = value === undefined ? fn.call(api, key) : fn.call(api, key, value);
        if (typeof result?.then === "function") {
            return Promise.resolve(result).catch(() => {
                reportSecureStorageUnavailable();
                return null;
            });
        }
        return Promise.resolve(result ?? null).catch(() => null);
    } catch {
        reportSecureStorageUnavailable();
        return Promise.resolve(null);
    }
}

export async function saveRefreshToken(token) {
    if (!isMaxMobilePlatform()) {
        return;
    }

    if (!token) {
        await clearRefreshToken();
        return;
    }

    await callSecureStorage("setItem", REFRESH_TOKEN_KEY, token);
}

export async function loadRefreshToken() {
    if (!isMaxMobilePlatform()) {
        return null;
    }

    const secureValue = await callSecureStorage("getItem", REFRESH_TOKEN_KEY);
    const refreshToken = secureValue?.value || secureValue || null;

    if (typeof refreshToken === "string" && refreshToken.trim()) {
        return refreshToken;
    }

    return null;
}

export async function clearRefreshToken() {
    if (!isMaxMobilePlatform()) {
        return;
    }

    await callSecureStorage("removeItem", REFRESH_TOKEN_KEY);
}
