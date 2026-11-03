import test from "node:test";
import assert from "node:assert/strict";

const ONEC_BASE_URL = "https://example.com/base/hs/omni/v1";

process.env.JWT_SECRET = "VeryStrongJwtSecret!2026-AlphaBeta";
process.env.NODE_ENV = "test";
process.env.ONEC_CONFIG_FILE = "__patients_not_found_test_missing.yml";
process.env.ONEC_CONFIG = JSON.stringify({ url: ONEC_BASE_URL, basicAuth: "base64_login_password" });

const originalFetch = global.fetch;
let clientsResponse = null;

global.fetch = async (url) => {
    if (url === `${ONEC_BASE_URL}/startIBSession`) {
        return new Response("", { status: 200, headers: { "set-cookie": "ibsession=test; Path=/" } });
    }
    if (url.startsWith(`${ONEC_BASE_URL}/catalogs/clients/`)) {
        return clientsResponse;
    }
    return new Response("{}", { status: 404 });
};

const { getPatientsByPhone } = await import("../src/services/onecRouter.js");

test.after(() => {
    global.fetch = originalFetch;
    delete process.env.ONEC_CONFIG;
    delete process.env.ONEC_CONFIG_FILE;
});

test("getPatientsByPhone returns empty list when 1C reports patients_not_found", async () => {
    clientsResponse = new Response(JSON.stringify({ error: "patients_not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
    });

    const patients = await getPatientsByPhone({ phone: "+79990001122" });

    assert.deepEqual(patients, []);
});

test("getPatientsByPhone still fails on other 1C errors", async () => {
    clientsResponse = new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
    });

    await assert.rejects(getPatientsByPhone({ phone: "+79990001122" }), /onec_request_failed/);
});
