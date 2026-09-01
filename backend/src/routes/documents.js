import { doctorAuthMiddleware, patientAuthMiddleware } from "../middleware/auth.js";
import {
    createAppointmentDocument,
    getDoctorSchedule,
    getDoctorAppointments,
    getDoctorShifts,
    getAppointmentsDocuments,
    getMedicalDocuments,
    getAppointmentsSchedule,
    getSurveysDocuments,
    getSurveyDocumentById,
    updateAppointmentDocument,
    updateSurveyDocument,
} from "../services/onecRouter.js";

function getRequestPayload(body) {
    if (!body) {
        return {};
    }

    if (typeof body === "string") {
        return JSON.parse(body || "{}");
    }

    return body;
}

export async function documentsRoutes(app) {
    app.get("/api/v1/documents/appointments",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const { patient_id } = req.user;
            const items = await getAppointmentsDocuments({ patient_id });

            return {
                items,
            };
        });

    app.get("/api/v1/documents/schedule",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const { doctorId, branchId, date, format } = req.query || {};

            if (!doctorId || !branchId) {
                return { items: [] };
            }

            const items = await getDoctorSchedule({
                doctorId,
                branchId,
                date,
                format,
            });

            return { items };
        });

    app.get("/api/v1/documents/medical",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const { patient_id } = req.user;
            const items = await getMedicalDocuments({ patient_id });

            return {
                items,
            };
        });

    app.get("/api/v1/documents/surveys",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const { patient_id } = req.user;
            const items = await getSurveysDocuments({ patient_id });

            return {
                items,
            };
        });

    app.get("/api/v1/documents/survey",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const { surveyId } = req.query || {};

            if (!surveyId) {
                return { item: null };
            }

            const item = await getSurveyDocumentById({ surveyId });
            return { item };
        });

    app.post("/api/v1/documents/appointments",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const { patient_id } = req.user;
            const payload = {
                ...getRequestPayload(req.body),
                patient_id,
            };

            const item = await createAppointmentDocument({ payload });
            return { item };
        });

    app.put("/api/v1/documents/appointments",
        { preHandler: [patientAuthMiddleware] },
        
        async (req) => {
            const { patient_id } = req.user;
            const payload = {
                ...getRequestPayload(req.body),
                patient_id,
            };

            const item = await updateAppointmentDocument({ payload });
            return { item };
        });

    app.put("/api/v1/documents/surveys",
        { preHandler: [patientAuthMiddleware] },
        async (req) => {
            const payload = getRequestPayload(req.body);
            const item = await updateSurveyDocument({ payload });
            return { item };
        });

    app.get("/api/v1/doctor/schedule",
        { preHandler: [doctorAuthMiddleware] },
        async (req, reply) => {
            const date = String(req.query?.date || "");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return reply.code(400).send({ error: "date_required" });
            }

            const doctorId = req.user.employee_id;
            const [shifts, appointments] = await Promise.all([
                getDoctorShifts({ doctorId, date }),
                getDoctorAppointments({ doctorId, date }),
            ]);

            return { date, shifts, appointments };
        });
}
