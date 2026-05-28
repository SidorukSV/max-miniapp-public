import { useNavigate } from "react-router-dom";
import { Container, Flex, Avatar, Typography, CellList, CellSimple, EllipsisText, Counter, Button } from "@maxhub/max-ui";
import { Calendar, LibraryBig, Gift, LogOut, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import PageLayout from "../components/PageLayout";
import "../App.css";
import { useAuth } from "../context/AuthContext.jsx";
import AuthScreen from "../components/AuthScreen.jsx";
import { HomeLoadingCard } from "../components/loadingCard.jsx";
import { useEffect, useState } from "react";
import AppointmentOptionsSheet from "../components/AppointmentOptionsSheet.jsx";
import {
    clearTokens,
    authLogout,
    getStoredAccessToken,
    getCatalogSpecializationsBySchedule,
    getSurveys,
    authSwitchPatient,
    storeTokens,
    getMe,
} from "../api.js";

import { getFallbackGradientByInitials } from "../modules/avatarGradient.js";
import { openExternalLink } from "../utils/safeUrl.js";
import { dateISOFormat } from "../modules/DateFormat.js";

function formatPhoneToInternational(phone) {
    if (!phone) return "";

    const cleaned = String(phone).replace(/[^\d+]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    const formatRu = (normalizedRuDigits) => `+7 ${normalizedRuDigits.slice(1, 4)} ${normalizedRuDigits.slice(4, 7)} ${normalizedRuDigits.slice(7, 9)} ${normalizedRuDigits.slice(9, 11)}`;

    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
        const normalized = `7${digits.slice(1)}`;
        return formatRu(normalized);
    }

    if (digits.length === 10) {
        return formatRu(`7${digits}`);
    }

    if (cleaned.startsWith("+")) {
        return `+${digits}`;
    }

    if (digits.length > 0) {
        return `+${digits}`;
    }

    return phone;
}

export default function Home() {
    const nav = useNavigate();
    const { me, loading, isAuthorized, setMe } = useAuth();

    const [busy, setBusy] = useState(false);
    const [specSheetOpen, setSpecSheetOpen] = useState(false);
    const [specSheetLoading, setSpecSheetLoading] = useState(false);
    const [specSheetError, setSpecSheetError] = useState("");
    const [onlineCount, setOnlineCount] = useState(0);
    const [offlineSpecs, setOfflineSpecs] = useState([]);
    const [newSurveysCount, setNewSurveysCount] = useState(0);
    const [isPatientsMenuOpen, setIsPatientsMenuOpen] = useState(false);
    const [patientSwitchBusy, setPatientSwitchBusy] = useState(false);
    const username = me?.fullName || "Иван Иванов";
    const phone = formatPhoneToInternational(me?.phone || "79123456789");
    const parts = username.trim().split(/\s+/, 2);
    const initials = parts.map(p => p[0]?.toUpperCase()).join("");
    const bonus = me?.bonus || 0;
    const patientsByPhone = Array.isArray(me?.patients_by_phone) ? me.patients_by_phone : [];
    const hasSeveralPatients = patientsByPhone.length > 1;

    useEffect(() => {
        async function loadSurveyCounters() {
            const accessToken = getStoredAccessToken();
            if (!accessToken) {
                setNewSurveysCount(0);
                return;
            }

            try {
                const response = await getSurveys(accessToken);
                const items = Array.isArray(response?.items) ? response.items : [];
                const newCount = items.filter((item) => !item?.isDone).length;
                setNewSurveysCount(newCount);
            } catch {
                setNewSurveysCount(0);
            }
        }

        loadSurveyCounters();
    }, [me?.patient_id]);

    async function handleLogout() {
        setBusy(true);
        try {
            await authLogout();
        } catch (err) {
            console.log(err);
        } finally {
            clearTokens();
            setMe(null);
            setBusy(false);
        }
    }

    function openPhone(phoneRaw) {
        const digits = String(phoneRaw || "").replace(/[^\d+]/g, "");
        if (!digits) return;
        window.location.href = `tel:${digits}`;
    }

    function openChat() {
        const chatUrl = import.meta.env.VITE_MAX_CHAT_URL || "";
        openExternalLink(chatUrl);
    }

    async function handleBookClick() {
        const accessToken = getStoredAccessToken();
        if (!accessToken) {
            nav("/book");
            return;
        }

        setSpecSheetLoading(true);
        setSpecSheetError("");

        try {
            const specsResponse = await getCatalogSpecializationsBySchedule(accessToken);

            const items = Array.isArray(specsResponse?.items) ? specsResponse.items : [];
            const online = items.filter((item) => item?.appointment_type === "online");
            const offline = items
                .filter((item) => item?.appointment_type === "phone" || item?.appointment_type === "phone_and_chat")
                .sort((a, b) => String(a?.specializationTitle.toUpperCase() || "").localeCompare(String(b?.specializationTitle.toUpperCase() || "")))
                .map((item) => ({
                    id: item.specializationId,
                    title: item.specializationTitle || "Без названия",
                    appointmentType: item.appointment_type,
                    appointmentPhone: item.appointement_phone || item.appointment_phone || "",
                }));

            if (!offline.length) {
                nav("/book");
                return;
            }

            setOnlineCount(online.length);
            setOfflineSpecs(offline);
            setSpecSheetOpen(true);
        } catch (error) {
            console.error(error);
            setSpecSheetError("Не удалось загрузить варианты записи. Открываем онлайн-запись.");
            nav("/book");
        } finally {
            setSpecSheetLoading(false);
        }
    }

    async function handleSwitchPatient(patientId) {
        const accessToken = getStoredAccessToken();
        if (!accessToken || !patientId || patientId === me?.patient_id) {
            setIsPatientsMenuOpen(false);
            return;
        }

        setPatientSwitchBusy(true);
        try {
            const switched = await authSwitchPatient({
                access_token: accessToken,
                patient_id: patientId,
            });
            storeTokens(switched);
            const meData = await getMe(switched.access_token);
            setMe(meData);
            setIsPatientsMenuOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setPatientSwitchBusy(false);
        }
    }

    if (loading) {
        return (
            <PageLayout showBottomButton={false}>
                <HomeLoadingCard />
            </PageLayout>
        );
    }

    if (!isAuthorized) {
        return <AuthScreen />;
    }

    return (
        <PageLayout
            bottomButtonText={specSheetLoading ? "Загружаем варианты..." : "Записаться на прием"}
            bottomButtonDisabled={specSheetLoading}
            onBottomButtonClick={handleBookClick}
        >
            <Flex direction="column" gap={10}>
                {/* Карточка пациента */}
                <Container className="card card--tight">
                    <Flex align="center" justify="space-between" gap={12}>
                        <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                            <Avatar.Container style={{ minWidth: 60 }} size={60} form="circle">
                                <Avatar.Image
                                    fallback={initials}
                                    fallbackGradient={getFallbackGradientByInitials(initials, me?.patient_id || phone)}
                                />
                            </Avatar.Container>

                            <div className="nameBlock">
                                <Flex align="center" gap={6}>
                                    <Typography.Title level={3} className="nameLine">
                                        <EllipsisText maxLines={3}>
                                            {username}
                                        </EllipsisText>
                                    </Typography.Title>
                                    {hasSeveralPatients && (
                                        <button
                                            type="button"
                                            className="iconButton"
                                            aria-label="Выбрать другого пациента"
                                            onClick={() => setIsPatientsMenuOpen((prev) => !prev)}
                                            disabled={patientSwitchBusy}
                                        >
                                            {isPatientsMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    )}
                                </Flex>

                                {/* "Пациент" отдельно под ФИО */}
                                <Typography.Label className="roleLine">
                                    {phone}
                                </Typography.Label>
                            </div>
                        </Flex>

                        <Flex align="center" gap={10} className="actions">

                            {/* Бонусы */}
                            <button
                                type="button"
                                className="bonusChip bonusChip--clickable"
                                onClick={() => nav("/bonuses")}
                                aria-label="Открыть бонусы"
                            >
                                <div className="bonusIcon">
                                    <Gift size={16} />
                                </div>
                                <Typography.Title level={3} className="bonusValue">
                                    {bonus} ₽
                                </Typography.Title>
                            </button>

                        </Flex>

                    </Flex>
                </Container>

                {hasSeveralPatients && isPatientsMenuOpen && (
                    <Container className="card card--tight">
                        <CellList>
                            {patientsByPhone.map((patient) => (
                                <CellSimple
                                    key={patient.id}
                                    title={patient.fullName}
                                    subtitle={dateISOFormat(patient.birthDate, "dd.MM.yyyy")}
                                    showChevron={patient.id !== me?.patient_id}
                                    selected={patient.id === me?.patient_id}
                                    onClick={() => handleSwitchPatient(patient.id)}
                                />
                            ))}
                        </CellList>
                    </Container>
                )}

                {/* Меню */}
                <Container className="card menuCard">
                    <CellList>
                        <CellSimple
                            before={<Calendar size={24} />}
                            showChevron
                            onClick={() => nav("/visits")}
                        >
                            Мои записи
                        </CellSimple>

                        <CellSimple
                            before={<LibraryBig size={24} />}
                            showChevron
                            onClick={() => nav("/history")}
                        >
                            История приёмов
                        </CellSimple>

                        <CellSimple
                            before={<ClipboardList size={24} />}
                            showChevron
                            onClick={() => nav("/surveys")}
                            after={newSurveysCount > 0 ? <Counter rounded={true} value={newSurveysCount}></Counter> : null}
                        >
                            Мои анкеты
                        </CellSimple>

                        <CellSimple
                            before={<LogOut size={24} />}
                            showChevron={false}
                            onClick={async () => handleLogout()}
                        >
                            {busy ? "Выходим" : "Выйти"}
                        </CellSimple>
                    </CellList>
                </Container>
            </Flex>
            <AppointmentOptionsSheet
                open={specSheetOpen}
                onlineCount={onlineCount}
                offlineSpecs={offlineSpecs}
                loading={specSheetLoading}
                error={specSheetError}
                onClose={() => setSpecSheetOpen(false)}
                onOnlineBook={() => {
                    setSpecSheetOpen(false);
                    nav("/book");
                }}
                onPhoneCall={openPhone}
                onOpenChat={openChat}
            />
        </PageLayout >
    );
}
