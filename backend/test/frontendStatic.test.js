import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("frontend static serving and SPA fallback", async (t) => {
    const cwd = process.cwd();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "max-frontend-static-"));
    const savedEnv = { ...process.env };
    let app;
    t.after(async () => {
        if (app) await app.close();
        process.chdir(cwd);
        for (const key of Object.keys(process.env)) {
            if (!(key in savedEnv)) delete process.env[key];
        }
        Object.assign(process.env, savedEnv);
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    // Keep local credentials and 1C configuration out of this test process.
    process.chdir(tempDir);
    Object.assign(process.env, {
        JWT_SECRET: "FrontendTestSecret!2026-NotForProduction",
        NODE_ENV: "test",
        ONEC_CONFIG_FILE: path.join(tempDir, "missing-onec.yml"),
        ONEC_CONFIG: "",
        MAX_BOT_TOKEN: "",
        MAX_WEBHOOK_SECRET: "",
        BACKEND_LOG_FILE: "",
        BACKEND_LOG_LEVEL: "silent",
        FRONTEND_DIST_DIR: path.join(tempDir, "dist"),
    });
    const dist = process.env.FRONTEND_DIST_DIR;
    const html = "<!doctype html><html><body>SPA fixture</body></html>";
    await fs.mkdir(path.join(dist, "assets"), { recursive: true });
    await fs.writeFile(path.join(dist, "index.html"), html, "utf8");
    await fs.writeFile(path.join(dist, "assets", "app.js"), "console.log('fixture');", "utf8");
    await fs.writeFile(path.join(dist, "assets", "app.css"), "body { color: black; }", "utf8");
    const { buildApp } = await import("../src/app.js");
    app = await buildApp();

    for (const url of ["/", "/index.html", "/appointments/42", "/appointments/42?tab=history.json"]) {
        await t.test(`GET ${url} serves the SPA`, async () => {
            const response = await app.inject({ url, headers: { accept: "text/html" } });
            assert.equal(response.statusCode, 200);
            assert.match(response.headers["content-type"], /text\/html/);
            assert.equal(response.body, html);
        });
    }
    await t.test("HEAD navigation has no body", async () => {
        const response = await app.inject({ method: "HEAD", url: "/appointments/42", headers: { accept: "text/html" } });
        assert.equal(response.statusCode, 200);
        assert.match(response.headers["content-type"], /text\/html/);
        assert.equal(response.body, "");
    });
    for (const [url, type] of [["/assets/app.js", /javascript/], ["/assets/app.css", /text\/css/]]) {
        await t.test(`existing resource ${url} keeps its content type`, async () => {
            const response = await app.inject({ url });
            assert.equal(response.statusCode, 200);
            assert.match(response.headers["content-type"], type);
            assert.notEqual(response.body, html);
        });
    }
    for (const url of [
        "/favicon.ico", "/vite.svg", "/logo-clinic-aldenta.png", "/missing.json?v=1",
        "/assets/missing.js", "/assets/missing", "/assets", "/.env", "/.git/config",
        "/missing%2Epng", "/api", "/api?x=1", "/api/v1/missing", "/%61pi/v1/missing",
    ]) {
        await t.test(`missing resource ${url} returns 404, not HTML or 500`, async () => {
            const response = await app.inject({ url, headers: { accept: "text/html" } });
            assert.equal(response.statusCode, 404);
            assert.equal(response.json().error, "not_found");
        });
    }
    await t.test("non-navigation and write requests do not receive SPA HTML", async () => {
        for (const options of [
            { url: "/missing", headers: { accept: "application/json" } },
            { url: "/missing" },
            { method: "POST", url: "/appointments/42", headers: { accept: "text/html" } },
        ]) {
            const response = await app.inject(options);
            assert.equal(response.statusCode, 404);
            assert.equal(response.json().error, "not_found");
        }
    });
    await t.test("health and version routes are preserved", async () => {
        for (const url of ["/healthz", "/api/v1/version"]) {
            const response = await app.inject({ url });
            assert.equal(response.statusCode, 200);
            assert.equal(response.json().status, "ok");
        }
    });
});
