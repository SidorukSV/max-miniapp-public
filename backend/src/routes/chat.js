import { patientAuthMiddleware } from "../middleware/auth.js";
import { sessionMiddleware } from "../middleware/session.js";
import { getCatalogSpecializationsBySchedule, startChatDialog } from "../services/onecRouter.js";
import { sendApiError } from "../utils/apiErrors.js";

async function startDialog(req, reply, identity) {
    const { specializationId } = req.body || {};

    if (typeof specializationId !== "string" || !specializationId.trim()) {
        return sendApiError(reply, 400, "specialization_id_required");
    }

    try {
        return await startChatDialog({ specializationId: specializationId.trim(), ...identity });
    } catch (error) {
        req.log.warn({ err: error, endpoint: req.url }, "Failed to start chat dialog");
        return sendApiError(reply, 502, "chat_start_failed");
    }
}

export async function chatRoutes(app) {
    app.post("/api/v1/chat/start",
        { preHandler: [patientAuthMiddleware] },
        (req, reply) => startDialog(req, reply, { patientId: req.user.patient_id }));

    app.post("/api/v1/auth/chat/specializations",
        { preHandler: [sessionMiddleware] },
        async (req, reply) => {
            if (!req.session.phone) {
                return sendApiError(reply, 403, "phone_not_verified");
            }

            try {
                const items = await getCatalogSpecializationsBySchedule();
                return { items };
            } catch (error) {
                req.log.warn({ err: error }, "Failed to load specializations for chat");
                return sendApiError(reply, 502, "specializations_unavailable");
            }
        });

    app.post("/api/v1/auth/chat/start",
        { preHandler: [sessionMiddleware] },
        (req, reply) => {
            if (!req.session.phone) {
                return sendApiError(reply, 403, "phone_not_verified");
            }

            const maxUserId = req.session.max_user?.id;
            if (!maxUserId) {
                return sendApiError(reply, 400, "max_user_required");
            }

            const { first_name: firstName, last_name: lastName } = req.session.max_user || {};
            const maxUserName = [firstName, lastName].filter(Boolean).join(" ");

            return startDialog(req, reply, { maxUserId, maxUserName, phone: req.session.phone });
        });
}
