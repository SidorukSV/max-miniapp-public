import { getSession } from "../store/authSessions.js";
import { sendApiError } from "../utils/apiErrors.js";

export async function sessionMiddleware(req, reply) {
    const { auth_session_id } = req.body || {};

    if (!auth_session_id) {
        return sendApiError(reply, 400, "auth_session_id_required");
    }

    const session = await getSession(auth_session_id);

    if (!session) {
        return sendApiError(reply, 400, "invalid_session");
    }

    if (session.expiresAt < Date.now()) {
        return sendApiError(reply, 400, "session_expired");
    }

    req.session = session;
}

export function normalizePhone(phone) {
    const rawPhone = String(phone || "").trim();

    if (!rawPhone || !/^[+\d\s()-]+$/.test(rawPhone)) {
        return null;
    }

    const plusCount = (rawPhone.match(/\+/g) || []).length;
    if (plusCount > 1 || (plusCount === 1 && !rawPhone.startsWith("+"))) {
        return null;
    }

    let digits = rawPhone.replace(/\D/g, "");

    if (digits.length === 10) {
        digits = `7${digits}`;
    } else if (digits.length === 11 && digits.startsWith("8")) {
        digits = `7${digits.slice(1)}`;
    }

    if (digits.length !== 11 || !digits.startsWith("7")) {
        return null;
    }

    return `+${digits}`;
}

export async function normalizePhoneMiddleware(req, reply) {
    const rawPhone = String(req.body.phone || "").trim();
    const normalizedPhone = normalizePhone(rawPhone);

    if (!normalizedPhone) {
        return sendApiError(reply, 400, "invalid_phone");
    }

    req.rawPhone = rawPhone;
    req.phone = normalizedPhone;
}
