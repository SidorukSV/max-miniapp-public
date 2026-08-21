import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "VeryStrongJwtSecret!2026-AlphaBeta";
process.env.NODE_ENV = "test";
process.env.ONEC_CONFIG_FILE = "__onec_router_response_test_missing.yml";
process.env.ONEC_CONFIG = JSON.stringify({
    url: "https://onec.example/base",
    basicAuth: "basic-onec",
});

const { getPatientsByPhone } = await import("../src/services/onecRouter.js");

function createTextResponse(status, body, headers = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name) {
                return headers[name.toLowerCase()] ?? null;
            },
        },
        async text() {
            return body;
        },
    };
}

test("patient lookup preserves a non-JSON 1C error and encodes the phone", async (t) => {
    const originalFetch = global.fetch;
    const requestedUrls = [];
    const platformError = "<exception><descr>Не указан идентификатор сеанса.</descr></exception>";

    global.fetch = async (url) => {
        if (url === "https://onec.example/base/startIBSession") {
            return createTextResponse(200, "", {
                "set-cookie": "ibsession=router-test-cookie; Path=/; HttpOnly",
            });
        }

        requestedUrls.push(url);
        return createTextResponse(400, platformError);
    };

    t.after(() => {
        global.fetch = originalFetch;
    });

    await assert.rejects(
        getPatientsByPhone({ phone: "+7 999&x" }),
        (error) => error.message.includes(platformError),
    );

    assert.equal(requestedUrls.length, 2, "onecFetch retries once after an error response");
    assert.ok(requestedUrls.every((url) => url.includes("phone=%2B7%20999%26x")));
});
