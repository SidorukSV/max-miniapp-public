import test from "node:test";
import assert from "node:assert/strict";

const JWT_SECRET = "doctor-schedule-test-secret-at-least-32-chars";
const ONEC_BASE_URL = "https://onec.example/base/hs/omni/v1";

process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = "test";
process.env.ONEC_CONFIG_FILE = "__doctor_schedule_test_missing.yml";
process.env.ONEC_CONFIG = JSON.stringify({
    url: ONEC_BASE_URL,
    basicAuth: "base64_login_password",
});

const requestedUrls = [];
const originalFetch = global.fetch;

function createJsonResponse(status, payload, headers = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name) {
                return headers[name.toLowerCase()] ?? null;
            },
        },
        async text() {
            return JSON.stringify(payload);
        },
    };
}

global.fetch = async (url) => {
    requestedUrls.push(String(url));

    if (url === `${ONEC_BASE_URL}/startIBSession`) {
        return createJsonResponse(200, {}, {
            "set-cookie": "ibsession=doctor-schedule-cookie; Path=/; HttpOnly",
        });
    }

    if (String(url).startsWith(`${ONEC_BASE_URL}/documents/schedule?`)) {
        return createJsonResponse(200, [{
            time_begin: "0001-01-01T09:00:00Z",
            time_end: "0001-01-01T18:00:00Z",
            branchTitle: "Филиал",
        }]);
    }

    if (String(url).startsWith(`${ONEC_BASE_URL}/documents/appointments?`)) {
        return createJsonResponse(200, [{
            appointment_id: "appointment-1",
            patientTitle: "Пациент",
            datetimeBegin: "2026-08-31T10:00:00Z",
            datetimeEnd: "2026-08-31T10:30:00Z",
        }]);
    }

    return createJsonResponse(404, { error: "not_found" });
};

const { buildApp } = await import("../src/app.js");
const { signAccessToken } = await import("../src/auth/jwt.js");

const app = await buildApp();
const doctorToken = signAccessToken({
    actor_type: "employee",
    employee_id: "doctor-from-token",
    role: "doctor",
});
const patientToken = signAccessToken({
    actor_type: "patient",
    patient_id: "patient-1",
});

test.after(async () => {
    await app.close();
    global.fetch = originalFetch;
    delete process.env.ONEC_CONFIG;
    delete process.env.ONEC_CONFIG_FILE;
});

test("doctor schedule uses doctor identity from JWT and returns shifts with appointments", async () => {
    requestedUrls.length = 0;
    const response = await app.inject({
        method: "GET",
        url: "/api/v1/doctor/schedule?date=2026-08-31&doctorId=spoofed-doctor",
        headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
        date: "2026-08-31",
        shifts: [{
            time_begin: "0001-01-01T09:00:00Z",
            time_end: "0001-01-01T18:00:00Z",
            branchTitle: "Филиал",
        }],
        appointments: [{
            appointment_id: "appointment-1",
            patientTitle: "Пациент",
            datetimeBegin: "2026-08-31T10:00:00Z",
            datetimeEnd: "2026-08-31T10:30:00Z",
        }],
    });

    const dataUrls = requestedUrls.filter((url) => !url.endsWith("/startIBSession"));
    assert.equal(dataUrls.length, 2);
    for (const url of dataUrls) {
        assert.match(url, /doctorId=doctor-from-token/);
        assert.doesNotMatch(url, /spoofed-doctor/);
        assert.match(url, /date=2026-08-31/);
    }
});

test("doctor schedule rejects patient context before requesting 1C", async () => {
    requestedUrls.length = 0;
    const response = await app.inject({
        method: "GET",
        url: "/api/v1/doctor/schedule?date=2026-08-31",
        headers: { Authorization: `Bearer ${patientToken}` },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error, "doctor_context_required");
    assert.equal(requestedUrls.length, 0);
});

test("doctor schedule validates date before requesting 1C", async () => {
    requestedUrls.length = 0;
    const response = await app.inject({
        method: "GET",
        url: "/api/v1/doctor/schedule?date=31.08.2026",
        headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error, "date_required");
    assert.equal(requestedUrls.length, 0);
});
