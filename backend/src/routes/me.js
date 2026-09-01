import { authMiddleware, patientAuthMiddleware } from "../middleware/auth.js";
import {
    DEFAULT_APPLICATION_SETTINGS,
    getApplicationSettings,
    getBonusTransactions,
    getEmployeeById,
    getPatientById,
    getPatientsByPhone,
} from "../services/onecRouter.js";
import { sendApiError } from "../utils/apiErrors.js";

export async function meRoutes(app) {
    app.get("/api/v1/me",
        { preHandler: [authMiddleware] },
        async (req, reply) => {
            const { actor_type, employee_id, patient_id, phone, channel } = req.user;
            try {
                if (actor_type === "employee") {
                    const employee = await getEmployeeById({ employee_id });
                    if (!employee) return sendApiError(reply, 404, "employee_not_found");

                    return {
                        ...employee,
                        actor_type: "employee",
                        employee_id,
                        phone,
                        channel,
                    };
                }

                const [patient, patientsByPhone, applicationSettings] = await Promise.all([
                    getPatientById({ patient_id }),
                    getPatientsByPhone({ phone }).catch(() => []),
                    getApplicationSettings().catch((error) => {
                        req.log.warn({
                            endpoint: "/api/v1/me",
                            operation: "getApplicationSettings",
                            err: error,
                        }, "Failed to load application settings; using defaults");

                        return DEFAULT_APPLICATION_SETTINGS;
                    }),
                ]);

                const patientsByPhoneSorted = Array.isArray(patientsByPhone)
                    ? [...patientsByPhone].sort((a, b) => String(a?.fullName || "").toUpperCase()
                        .localeCompare(String(b?.fullName || "").toUpperCase()))
                    : [];

                return {
                    ...patient,
                    actor_type: "patient",
                    phone,
                    channel,
                    patients_by_phone: patientsByPhoneSorted,
                    ...applicationSettings,
                };
            } catch (error) {
                req.log.error({
                    endpoint: "/api/v1/me",
                    operation: "getPatientById",
                    err: error,
                }, "Failed to load profile");
                return sendApiError(reply, 502, "profile_unavailable");
            }
        });

    app.get("/api/v1/me/bonus-transactions",
        { preHandler: [patientAuthMiddleware] },
        async (req, reply) => {
            const { patient_id } = req.user;
            try {
                const transactions = await getBonusTransactions({ patient_id });
                return {
                    items: transactions,
                };
            } catch (error) {
                req.log.error({
                    endpoint: "/api/v1/me/bonus-transactions",
                    operation: "getBonusTransactions",
                    err: error,
                }, "Failed to load bonus transactions");
                return sendApiError(reply, 502, "bonus_transactions_unavailable");
            }
        });

}
