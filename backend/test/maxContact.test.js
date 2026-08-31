import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET || "VeryStrongJwtSecret!2026-AlphaBeta";

const {
    createMaxContactHash,
    verifyMaxContact,
} = await import("../src/auth/maxContact.js");
const { normalizePhone } = await import("../src/middleware/session.js");

const BOT_TOKEN = "max-test-bot-token";
const PHONE = "+79991234567";
const AUTH_DATE = "1700000000";
const USER_ID = "123456789";
const HASH = "ec5880179ce589a698e82a7ccc99d752e1d9284431593815035a59c68d9a656f";

test("MAX contact hash follows authDate, phone and userId contract", () => {
    assert.equal(createMaxContactHash({
        phone: PHONE,
        authDate: AUTH_DATE,
        userId: USER_ID,
        botToken: BOT_TOKEN,
    }), HASH);
});

test("valid MAX contact proof is accepted", () => {
    const result = verifyMaxContact({
        phone: PHONE,
        authDate: AUTH_DATE,
        userId: USER_ID,
        hash: HASH,
        botToken: BOT_TOKEN,
        maxAgeSeconds: 300,
        nowUnix: Number(AUTH_DATE) + 60,
    });

    assert.deepEqual(result, {
        ok: true,
        authDate: Number(AUTH_DATE),
        phone: "79991234567",
        userId: USER_ID,
    });
});

test("MAX contact proof rejects a substituted phone", () => {
    assert.throws(() => verifyMaxContact({
        phone: "+79991234568",
        authDate: AUTH_DATE,
        userId: USER_ID,
        hash: HASH,
        botToken: BOT_TOKEN,
        maxAgeSeconds: 300,
        nowUnix: Number(AUTH_DATE) + 60,
    }), /contact_invalid_signature/);
});

test("MAX contact proof rejects another MAX user", () => {
    assert.throws(() => verifyMaxContact({
        phone: PHONE,
        authDate: AUTH_DATE,
        userId: "987654321",
        hash: HASH,
        botToken: BOT_TOKEN,
        maxAgeSeconds: 300,
        nowUnix: Number(AUTH_DATE) + 60,
    }), /contact_invalid_signature/);
});

test("MAX contact proof rejects expired and future timestamps", () => {
    assert.throws(() => verifyMaxContact({
        phone: PHONE,
        authDate: AUTH_DATE,
        userId: USER_ID,
        hash: HASH,
        botToken: BOT_TOKEN,
        maxAgeSeconds: 300,
        nowUnix: Number(AUTH_DATE) + 301,
    }), /contact_expired/);

    assert.throws(() => verifyMaxContact({
        phone: PHONE,
        authDate: AUTH_DATE,
        userId: USER_ID,
        hash: HASH,
        botToken: BOT_TOKEN,
        maxAgeSeconds: 300,
        nowUnix: Number(AUTH_DATE) - 31,
    }), /contact_auth_date_in_future/);
});

test("MAX contact proof requires hash and valid phone", () => {
    assert.throws(() => verifyMaxContact({
        phone: PHONE,
        authDate: AUTH_DATE,
        userId: USER_ID,
        hash: "",
        botToken: BOT_TOKEN,
        nowUnix: Number(AUTH_DATE),
    }), /contact_hash_required/);

    assert.throws(() => createMaxContactHash({
        phone: "+7 (999) 123-45-67",
        authDate: AUTH_DATE,
        userId: USER_ID,
        botToken: BOT_TOKEN,
    }), /contact_phone_invalid/);
});

test("phone normalization produces one Russian canonical form", () => {
    assert.equal(normalizePhone("+7 (999) 123-45-67"), "+79991234567");
    assert.equal(normalizePhone("8 999 123 45 67"), "+79991234567");
    assert.equal(normalizePhone("9991234567"), "+79991234567");
    assert.equal(normalizePhone("++79991234567"), null);
    assert.equal(normalizePhone("call:+79991234567"), null);
    assert.equal(normalizePhone("+12345"), null);
});
