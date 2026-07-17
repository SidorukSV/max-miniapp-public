import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    authStart,
    authPhone,
    authSelectPatient,
    storeTokens,
    getMe,
    sendAuthDiagnostic,
} from "../api";
import { Flex, Container, Typography, CellList, CellSimple, CellHeader, Input } from "./ui.jsx";
import "../App.css";
import { useMaxWebApp } from "../hooks/useMaxWebApp";
import { dateISOFormat } from "../modules/DateFormat";
import PageLayout from "./PageLayout";
import { appConfig } from "../config.js";

function createAuthTraceId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function getErrorDetails(error) {
    const nestedCode = error && typeof error === "object"
        ? error.error?.code
        : null;
    const directCode = error && typeof error === "object"
        ? error.code
        : null;
    const message = error instanceof Error
        ? error.message
        : (typeof error === "string" ? error : "");
    const name = error instanceof Error ? error.name : typeof error;

    return {
        errorCode: typeof nestedCode === "string"
            ? nestedCode
            : (typeof directCode === "string" ? directCode : ""),
        errorMessage: message,
        errorName: name,
    };
}

function getAuthErrorMessage(error) {
    const { errorCode, errorMessage } = getErrorDetails(error);
    const code = errorCode || errorMessage;

    switch (code) {
        case "manual_phone_required":
            return "Введите номер телефона для теста в localhost.";
        case "manual_totp_required":
            return "Введите 6-значный TOTP код из приложения-аутентификатора.";
        case "dev_totp_invalid":
            return "Неверный TOTP код для dev-авторизации. Проверьте код в приложении.";
        case "dev_totp_not_configured":
            return "Backend не настроен: задайте DEV_TOTP_SECRET.";
        case "request_contact_unavailable":
            return "Запрос контакта недоступен в данном клиенте.";
        case "contact_not_send":
            return "MAX не вернул номер телефона.";
        case "client.request_phone.user_refused_provide_phone_number":
            return "Передача контакта отменена пользователем.";
        case "client.request_phone.request_error":
            return "MAX не смог обработать запрос контакта.";
        default:
            return "Авторизация не пройдена. Попробуйте ещё раз.";
    }
}

export default function AuthScreen() {
    const { webApp, initData } = useMaxWebApp();
    const { setMe } = useAuth();

    const [authSessionId, setAuthSessionId] = useState(null);
    const [patients, setPatients] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [manualPhone, setManualPhone] = useState("");
    const [manualTotpCode, setManualTotpCode] = useState("");
    const communicationConsentUrl = appConfig.communicationConsentUrl;

    const isBrowserLocalhost = useMemo(() => {
        const host = window.location.hostname;
        return host === "localhost" || host === "127.0.0.1";
    }, []);

    function reportAuthDiagnostic(event, traceId, details = {}, level = "info") {
        void sendAuthDiagnostic({
            event,
            trace_id: traceId,
            level,
            details,
        });
    }

    async function getPhonePayload(traceId) {
        if (isBrowserLocalhost) {
            if (!manualPhone.trim()) {
                throw new Error("manual_phone_required");
            }

            const normalizedTotpCode = manualTotpCode.replace(/\s+/g, "");
            if (!/^\d{6}$/.test(normalizedTotpCode)) {
                throw new Error("manual_totp_required");
            }

            return {
                phone: manualPhone,
                channel: "web",
                proof: {
                    totp_code: normalizedTotpCode,
                },
            };
        }

        if (!webApp?.requestContact) {
            reportAuthDiagnostic("contact_request_unavailable", traceId, {
                webAppPresent: Boolean(webApp),
                requestMethodPresent: Boolean(webApp?.requestContact),
                launchDataPresent: Boolean(initData),
            }, "error");
            throw new Error("request_contact_unavailable");
        }

        reportAuthDiagnostic("contact_request_started", traceId, {
            platform: webApp.platform || "unknown",
            bridgeVersion: webApp.version || "unknown",
            launchDataPresent: Boolean(initData),
            launchDataLength: initData.length,
            launchUserPresent: Boolean(webApp.initDataUnsafe?.user),
            queryIdPresent: Boolean(webApp.initDataUnsafe?.query_id),
            online: navigator.onLine,
            visibilityState: document.visibilityState,
        });

        const sendContact = await webApp.requestContact();
        const phone = sendContact?.phone || "";

        reportAuthDiagnostic("contact_request_completed", traceId, {
            responseType: sendContact === null ? "null" : typeof sendContact,
            responseKeys: sendContact && typeof sendContact === "object"
                ? Object.keys(sendContact).slice(0, 10).join(",")
                : "",
            numberPresent: Boolean(phone),
            authDatePresent: Boolean(sendContact?.authDate),
            hashPresent: Boolean(sendContact?.hash),
            bridgeErrorCode: typeof sendContact?.error?.code === "string"
                ? sendContact.error.code
                : "",
        }, phone ? "info" : "warn");

        if (!phone) {
            const bridgeErrorCode = sendContact?.error?.code;
            throw new Error(
                typeof bridgeErrorCode === "string"
                    ? bridgeErrorCode
                    : "contact_not_send"
            );
        }

        return {
            phone,
            channel: "max",
            proof: { init_data: initData },
        };
    }

    async function handleStart() {
        setBusy(true);
        setError("");

        const traceId = createAuthTraceId();
        let stage = "auth_start";

        reportAuthDiagnostic("auth_flow_started", traceId, {
            platform: webApp?.platform || "unknown",
            bridgeVersion: webApp?.version || "unknown",
            webAppPresent: Boolean(webApp),
            launchDataPresent: Boolean(initData),
            launchDataLength: initData.length,
        });

        try {
            const start = await authStart();
            setAuthSessionId(start.auth_session_id);
            reportAuthDiagnostic("auth_start_completed", traceId, {
                startResponseValid: Boolean(start.auth_session_id),
            });

            stage = "contact_request";
            const phonePayload = await getPhonePayload(traceId);

            stage = "auth_phone";
            reportAuthDiagnostic("auth_phone_started", traceId, {
                channel: phonePayload.channel,
                launchDataPresent: Boolean(initData),
            });
            const phoneResult = await authPhone({
                auth_session_id: start.auth_session_id,
                phone: phonePayload.phone,
                channel: phonePayload.channel,
                proof: phonePayload.proof,
                init_data: initData,
            });

            const matchedPatients = phoneResult.patients || [];
            reportAuthDiagnostic("auth_phone_completed", traceId, {
                patientCount: matchedPatients.length,
            });
            setPatients(matchedPatients);

            if (matchedPatients.length === 1) {
                stage = "select_patient";
                await handleSelectPatient(matchedPatients[0].id, start.auth_session_id);
            }
        } catch (err) {
            console.error(err);
            reportAuthDiagnostic("auth_flow_failed", traceId, {
                stage,
                ...getErrorDetails(err),
            }, "error");

            const diagnosticCode = traceId.slice(-8);
            setError(`${getAuthErrorMessage(err)} Код диагностики: ${diagnosticCode}`);
        } finally {
            setBusy(false);
        }
    }

    async function handleSelectPatient(patientId, sessionId = authSessionId) {
        if (!sessionId) return;

        setBusy(true);
        setError("");

        try {
            const result = await authSelectPatient({
                auth_session_id: sessionId,
                patient_id: patientId,
            });

            storeTokens(result);

            const meData = await getMe(result.access_token);
            setMe(meData);
        } catch (err) {
            console.error(err);
            setError("Не удалось выбрать пациента.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <PageLayout
            showBottom={false}
            showBottomButton={!patients.length}
            bottomButtonText={busy ? "Подтверждаем номер..." : "Подтвердить номер телефона"}
            onBottomButtonClick={handleStart}
            bottomButtonDisabled={busy}
            after={(
                <Typography.Label className="authPolicyText">
                    Нажимая кнопку &quot;Подтвердить номер телефона&quot; вы соглашаетесь с 
                     {" "}<Link to="/privacy-policy" className="authPolicyLink">политикой обработки персональных данных</Link>
                     {communicationConsentUrl && (
                        <span>, <Link to="/communication-consent" className="authPolicyLink">согласием на коммуникацию</Link></span>
                        )
                    }
                    {" "}и {" "}
                    <Link to="/personal-data-consent" className="authPolicyLink">согласием на обработку персональных данных</Link>.
                </Typography.Label>
            )}
        >
            <Flex direction="column">
                <Container className="card">
                    <Flex direction="column" gap={10}>
                        <Typography.Title level={2}>Вход в личный кабинет</Typography.Title>
                        {!patients.length && (
                            <Typography.Label className="roleLine">
                                Подтвердите номер телефона, чтобы продолжить.
                            </Typography.Label>
                        )}

                        {isBrowserLocalhost && (
                            <>
                                <Input
                                    mode="secondary"
                                    type="tel"
                                    value={manualPhone}
                                    onChange={(event) => setManualPhone(event.target.value)}
                                    placeholder="Введите номер телефона"
                                />
                                <Input
                                    mode="secondary"
                                    type="text"
                                    value={manualTotpCode}
                                    onChange={(event) => setManualTotpCode(event.target.value)}
                                    placeholder="Введите TOTP код из приложения"
                                />
                            </>
                        )}

                        {!!patients.length && (
                            <CellList
                                header={<CellHeader titleStyle="caps">Выберите пациента</CellHeader>}
                                filled
                                mode="island"
                            >
                                {patients.map((patient) => (
                                    <CellSimple
                                        key={patient.id}
                                        height="normal"
                                        title={patient.fullName}
                                        subtitle={dateISOFormat(patient.birthDate, "dd.MM.yyyy")}
                                        showChevron
                                        onClick={() => handleSelectPatient(patient.id)}
                                    />
                                ))}
                            </CellList>
                        )}

                        {error && (
                            <div className="authError">
                                <Typography.Label>{error}</Typography.Label>
                            </div>
                        )}
                    </Flex>
                </Container>
            </Flex>
        </PageLayout>
    );
}
