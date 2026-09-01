import crypto from "node:crypto";

const DEFAULT_MAX_AGE_SECONDS = 300;
const MAX_FUTURE_SKEW_SECONDS = 30;

function safeCompareHex(leftHex, rightHex) {
    if (!/^[a-f0-9]{64}$/i.test(leftHex) || !/^[a-f0-9]{64}$/i.test(rightHex)) {
        return false;
    }

    return crypto.timingSafeEqual(
        Buffer.from(leftHex, "hex"),
        Buffer.from(rightHex, "hex")
    );
}

function normalizeSignedPhone(phone) {
    if (typeof phone !== "string") {
        throw new Error("contact_phone_required");
    }

    const normalized = phone.trim().replace(/^\+/, "");

    if (!/^\d+$/.test(normalized)) {
        throw new Error("contact_phone_invalid");
    }

    return normalized;
}

function normalizeAuthDate(authDate) {
    const value = String(authDate ?? "").trim();

    if (!/^\d+$/.test(value)) {
        throw new Error("contact_auth_date_invalid");
    }

    const rawTimestamp = Number(value);

    if (!Number.isSafeInteger(rawTimestamp) || rawTimestamp <= 0) {
        throw new Error("contact_auth_date_invalid");
    }

    let timestamp;
    if (value.length === 10) {
        timestamp = rawTimestamp;
    } else if (value.length === 13) {
        timestamp = Math.floor(rawTimestamp / 1000);
    } else {
        throw new Error("contact_auth_date_invalid");
    }

    return { raw: value, timestamp };
}

function normalizeUserId(userId) {
    const value = String(userId ?? "").trim();

    if (!/^\d+$/.test(value)) {
        throw new Error("contact_user_id_invalid");
    }

    return value;
}

export function createMaxContactHash({ phone, authDate, userId, botToken }) {
    if (!botToken) {
        throw new Error("max_bot_token_not_configured");
    }

    const signedPhone = normalizeSignedPhone(phone);
    const signedAuthDate = normalizeAuthDate(authDate).raw;
    const signedUserId = normalizeUserId(userId);
    const dataCheckString = [
        `authDate=${signedAuthDate}`,
        `phone=${signedPhone}`,
        `userId=${signedUserId}`,
    ].join("\n");

    return crypto
        .createHmac("sha256", botToken)
        .update(dataCheckString)
        .digest("hex");
}

export function verifyMaxContact({
    phone,
    authDate,
    hash,
    userId,
    botToken,
    maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
    nowUnix = Math.floor(Date.now() / 1000),
} = {}) {
    if (typeof hash !== "string" || !hash.trim()) {
        throw new Error("contact_hash_required");
    }

    const { timestamp } = normalizeAuthDate(authDate);
    const allowedAge = Number(maxAgeSeconds);

    if (!Number.isFinite(allowedAge) || allowedAge <= 0) {
        throw new Error("contact_max_age_invalid");
    }

    if (timestamp - nowUnix > MAX_FUTURE_SKEW_SECONDS) {
        throw new Error("contact_auth_date_in_future");
    }

    if (nowUnix - timestamp > allowedAge) {
        throw new Error("contact_expired");
    }

    const computedHash = createMaxContactHash({
        phone,
        authDate,
        userId,
        botToken,
    });

    if (!safeCompareHex(computedHash, hash.trim())) {
        throw new Error("contact_invalid_signature");
    }

    return {
        ok: true,
        authDate: timestamp,
        phone: normalizeSignedPhone(phone),
        userId: normalizeUserId(userId),
    };
}
