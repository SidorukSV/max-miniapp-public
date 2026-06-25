import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authStart, authPhone, authSelectPatient, storeTokens, getMe } from "../api";
import { Flex, Container, Typography, CellList, CellSimple, CellHeader, Input } from "./ui.jsx";
import "../App.css";
import { useMaxWebApp } from "../hooks/useMaxWebApp";
import { dateISOFormat } from "../modules/DateFormat";
import PageLayout from "./PageLayout";
import { appConfig } from "../config.js";

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

    async function getPhonePayload() {
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
            throw new Error("request_contact_unavailable");
        }

        const sendContact = await webApp.requestContact();
        const phone = sendContact?.phone || "";

        if (!phone) {
            throw new Error("contact_not_send");
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

        try {
            const start = await authStart();
            setAuthSessionId(start.auth_session_id);

            const phonePayload = await getPhonePayload();

            const phoneResult = await authPhone({
                auth_session_id: start.auth_session_id,
                phone: phonePayload.phone,
                channel: phonePayload.channel,
                proof: phonePayload.proof,
                init_data: initData,
            });

            const matchedPatients = phoneResult.patients || [];
            setPatients(matchedPatients);

            if (matchedPatients.length === 1) {
                await handleSelectPatient(matchedPatients[0].id, start.auth_session_id);
            }
        } catch (err) {
            console.error(err);

            switch (err.message) {
                case "manual_phone_required":
                    setError("Введите номер телефона для теста в localhost.");
                    break;
                case "manual_totp_required":
                    setError("Введите 6-значный TOTP код из приложения-аутентификатора.");
                    break;
                case "dev_totp_invalid":
                    setError("Неверный TOTP код для dev-авторизации. Проверьте код в приложении.");
                    break;
                case "dev_totp_not_configured":
                    setError("Backend не настроен: задайте DEV_TOTP_SECRET.");
                    break;
                case "request_contact_unavailable":
                    setError("Запрос контакта недоступен в данном клиенте");
                    break;
                case "contact_not_send":
                    setError("Контакт не отправлен. Попробуйте ещё раз");
                    break;
                default:
                    setError("Авторизация не пройдена. Попробуйте ещё раз");
            }
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
                      <Link to="/communication-consent" className="authPolicyLink">согласием на коммуникацию</Link>  
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
