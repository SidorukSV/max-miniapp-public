import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET || "doctor-context-test-secret-at-least-32-chars";

const { signAccessToken } = await import("../src/auth/jwt.js");
const { doctorAuthMiddleware, patientAuthMiddleware } = await import("../src/middleware/auth.js");

function createReply() {
    return {
        sent: false,
        statusCode: 200,
        code(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        send(payload) {
            this.sent = true;
            this.payload = payload;
            return payload;
        },
    };
}

test("doctor context accepts an employee token and rejects patient token", async () => {
    const doctorToken = signAccessToken({
        actor_type: "employee",
        employee_id: "doctor-1",
        role: "doctor",
    });
    const doctorRequest = { headers: { authorization: `Bearer ${doctorToken}` } };
    const doctorReply = createReply();

    await doctorAuthMiddleware(doctorRequest, doctorReply);
    assert.equal(doctorReply.sent, false);
    assert.equal(doctorRequest.user.employee_id, "doctor-1");

    const patientToken = signAccessToken({ actor_type: "patient", patient_id: "patient-1" });
    const patientRequest = { headers: { authorization: `Bearer ${patientToken}` } };
    const patientReply = createReply();

    await doctorAuthMiddleware(patientRequest, patientReply);
    assert.equal(patientReply.statusCode, 403);
    assert.equal(patientReply.payload.error, "doctor_context_required");
});

test("patient context keeps compatibility with legacy patient tokens", async () => {
    const legacyToken = signAccessToken({ patient_id: "patient-1" });
    const request = { headers: { authorization: `Bearer ${legacyToken}` } };
    const reply = createReply();

    await patientAuthMiddleware(request, reply);
    assert.equal(reply.sent, false);
    assert.equal(request.user.patient_id, "patient-1");
});
