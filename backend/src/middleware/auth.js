import { verifyToken } from "../auth/jwt.js";
import { sendApiError } from "../utils/apiErrors.js";

export async function authMiddleware(req, reply) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return sendApiError(reply, 401, "no_token");
        }

        const token = authHeader.replace("Bearer ", "");

        const decoded = verifyToken(token);
        if (decoded.token_type === "refresh") {
            return sendApiError(reply, 401, "invalid_token_type");
        }

        req.user = decoded;
    } catch (err) {
        return sendApiError(reply, 401, "invalid_token");
    }
}

export async function patientAuthMiddleware(req, reply) {
    await authMiddleware(req, reply);
    if (reply.sent) return;

    if (!req.user?.patient_id || (req.user.actor_type && req.user.actor_type !== "patient")) {
        return sendApiError(reply, 403, "patient_context_required");
    }
}

export async function doctorAuthMiddleware(req, reply) {
    await authMiddleware(req, reply);
    if (reply.sent) return;

    if (req.user?.actor_type !== "employee" || req.user?.role !== "doctor" || !req.user?.employee_id) {
        return sendApiError(reply, 403, "doctor_context_required");
    }
}
