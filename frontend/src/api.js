import {
    saveRefreshToken,
    loadRefreshToken,
    clearRefreshToken,
    isMaxMobilePlatform,
} from "./maxSecureStorage";

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:3000/api/v1" : "/api/v1");
let inMemoryAccessToken = null;

export async function apiFetch(path, options = {}) {
    const hasBody = options.body !== undefined;

    const res = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: {
            ...(hasBody ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
        },
        ...options,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || "api_error");
    }

    return data;
}

export function getStoredAccessToken() {
    return inMemoryAccessToken;
}

export function storeTokens({ access_token, refresh_token }) {
    inMemoryAccessToken = access_token || null;
    saveRefreshToken(refresh_token).catch(() => {});
}

export function clearTokens() {
    inMemoryAccessToken = null;
    clearRefreshToken().catch(() => {});
}

export async function authStart() {
    return apiFetch("/auth/start", {
        method: "POST",
    });
}

export async function authPhone({ auth_session_id, phone, channel, proof, init_data }) {
    return apiFetch("/auth/phone", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, phone, channel, proof, init_data }),
    });
}

export async function authSelectPatient({ auth_session_id, patient_id }) {
    return apiFetch("/auth/select-patient", {
        method: "POST",
        body: JSON.stringify({ auth_session_id, patient_id }),
    });
}

export async function authSwitchPatient({ access_token, patient_id }) {
    return apiFetch("/auth/switch-patient", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ patient_id }),
    });
}

export async function authRefresh() {
    const refreshToken = await loadRefreshToken();

    if (isMaxMobilePlatform() && !refreshToken) {
        throw new Error("refresh_token_unavailable");
    }

    return apiFetch("/auth/refresh", {
        method: "POST",
        ...(refreshToken ? { body: JSON.stringify({ refresh_token: refreshToken }) } : {}),
    });
}

export async function authLogout() {
    const refreshToken = await loadRefreshToken();

    return apiFetch("/auth/logout", {
        method: "POST",
        ...(refreshToken ? { body: JSON.stringify({ refresh_token: refreshToken }) } : {}),
    });
}

export async function getMe(access_token) {
    return apiFetch("/me", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getVersion() {
    return apiFetch("/version");
}

export async function getBonusTransactions(access_token) {
    return apiFetch("/me/bonus-transactions", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getAppointments(access_token) {
    return apiFetch("/documents/appointments", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getMedicalHistory(access_token) {
    return apiFetch("/documents/medical", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getSurveys(access_token) {
    return apiFetch("/documents/surveys", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getSurveyById(access_token, surveyId) {
    const params = new URLSearchParams({
        search_type: "ByID",
        surveyId,
    });

    return apiFetch(`/documents/survey?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function updateAppointment(access_token, payload) {
    return apiFetch("/documents/appointments", {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function createAppointment(access_token, payload) {
    return apiFetch("/documents/appointments", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
    });
}

export async function getAppointmentsSchedule(access_token, specializationId) {
    const params = new URLSearchParams();
    if (specializationId) {
        params.set("specializationId", specializationId);
    }

    return apiFetch(`/documents/schedule${params.toString() ? `?${params}` : ""}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogSpecializationsBySchedule(access_token) {
    const params = new URLSearchParams({
        search_type: "BySchedule",
    });
    return apiFetch(`/catalogs/specializations?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogEmployeesBySpec(access_token, specializationId) {
    const params = new URLSearchParams({
        search_type: "BySpec",
        specializationId,
    });

    return apiFetch(`/catalogs/employees?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogSurveyTemplates(access_token) {
    return apiFetch("/catalogs/surveyTemplates", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getCatalogSurveyTemplateById(access_token, surveyTemplateId) {
    const params = new URLSearchParams({
        search_type: "ByID",
        surveyTemplateId,
    });

    return apiFetch(`/catalogs/surveyTemplates?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function getDoctorSchedule(access_token, { doctorId, branchId, date, format }) {
    const params = new URLSearchParams({
        doctorId,
        branchId,
    });

    if (date) params.set("date", date);
    if (format) params.set("format", format);

    return apiFetch(`/documents/schedule?${params}`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });
}

export async function sendLogs(log) {
    return apiFetch("/send-log", {
        method: "POST",
        body: JSON.stringify( { log }),
    });
}
