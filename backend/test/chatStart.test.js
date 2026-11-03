import test from "node:test";
import assert from "node:assert/strict";

const JWT_SECRET = "VeryStrongJwtSecret!2026-AlphaBeta";
const ONEC_BASE_URL = "https://example.com/base/hs/omni/v1";

function createJsonResponse(status, payload, headers = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name) {
                return headers[name.toLowerCase()] ?? null;
            },
        },
        async json() {
            return payload;
        },
        async text() {
            return typeof payload === "string" ? payload : JSON.stringify(payload);
        },
    };
}

process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = "test";
process.env.ONEC_CONFIG_FILE = "__chat_start_test_missing.yml";
process.env.ONEC_CONFIG = JSON.stringify({
    url: ONEC_BASE_URL,
    basicAuth: "base64_login_password",
});

const originalFetch = global.fetch;
const chatStartRequests = [];
let chatStartResponse = createJsonResponse(200, { messageSent: true });

global.fetch = async (url, options = {}) => {
    if (url === `${ONEC_BASE_URL}/startIBSession`) {
        return createJsonResponse(200, {}, {
            "set-cookie": "ibsession=chat-start-test-cookie; Path=/; HttpOnly",
        });
    }

    if (url === `${ONEC_BASE_URL}/chat/start`) {
        chatStartRequests.push(JSON.parse(options.body));
        return chatStartResponse;
    }

    return createJsonResponse(404, { error: "not_found" });
};

const { buildApp } = await import("../src/app.js");
const { signAccessToken } = await import("../src/auth/jwt.js");

const app = await buildApp();
const accessToken = signAccessToken({
    actor_type: "patient",
    patient_id: "patient-1",
    phone: "+79990001122",
    channel: "max",
});

test.after(async () => {
    await app.close();
    global.fetch = originalFetch;
    delete process.env.ONEC_CONFIG;
    delete process.env.ONEC_CONFIG_FILE;
});

function startChat(body, headers = { Authorization: `Bearer ${accessToken}` }) {
    return app.inject({
        method: "POST",
        url: "/api/v1/chat/start",
        headers,
        payload: body,
    });
}

test("/api/v1/chat/start passes patient and specialization to 1C", async () => {
    chatStartRequests.length = 0;

    const response = await startChat({ specializationId: " spec-1 " });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { messageSent: true });
    assert.deepEqual(chatStartRequests, [{ specializationId: "spec-1", patientId: "patient-1" }]);
});

test("/api/v1/chat/start requires specialization", async () => {
    const response = await startChat({});

    assert.equal(response.statusCode, 400);
});

test("/api/v1/chat/start requires authorization", async () => {
    const response = await startChat({ specializationId: "spec-1" }, {});

    assert.equal(response.statusCode, 401);
});

test("/api/v1/chat/start reports 1C failure as 502", async () => {
    chatStartResponse = createJsonResponse(500, { error: "chat_start_failed" });

    const response = await startChat({ specializationId: "spec-1" });

    assert.equal(response.statusCode, 502);
});
