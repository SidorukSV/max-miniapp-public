import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button, CellHeader } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import QuestionDialog from "../components/QuestionDialog";
import { getAppointments, getStoredAccessToken, updateAppointment } from "../api";
import "../App.css";
import MyVisitsSkeleton from "../components/my-visits/MyVisitsSkeleton.jsx";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import { CalendarClock } from "lucide-react";

function normalizeAppointment(item, index) {
    const sourceDate = item?.datetimeBegin || item?.appointment_date || "";
    const dateObj = sourceDate ? new Date(sourceDate) : null;
    const isValidDate = dateObj instanceof Date && !Number.isNaN(dateObj.valueOf());
    const date = isValidDate ? dateObj.toLocaleDateString("ru-RU") : "Без даты";
    const time = isValidDate ? dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "--:--";

    return {
        id: item?.appointment_id || item?.appointmentId || item?.id || `appointment-${index}`,
        date,
        time,
        doctor: [
            item?.doctorLastname,
            item?.doctorFirstname,
            item?.doctorPatronimic,
        ].filter(Boolean).join(" ") || "Не указан",
        doctorId: item?.doctorId || "",
        spec: item?.specializationTitle || "Специализация не указана",
        specializationId: item?.specializationId || "",
        place: item?.cabinetTitle || "Кабинет не указан",
        clinic: item?.branchTitle || "Филиал не указан",
        status: item?.conditionTitle || "Статус не указан",
        isApproved: item?.isApproved,
    };
}

function VisitCard({ v, pendingId, onConfirm, onCancel, onReschedule }) {
    const isConfirmedByPatient = v.isApproved === true;
    const canBeConfirmedByPatient = v.isApproved !== undefined;
    const shouldShowConfirmButton = canBeConfirmedByPatient && !isConfirmedByPatient;
    const isBusy = pendingId === v.id;

    return (
        <Container className="card">
            <Flex direction="column" gap={12}>
                <Flex align="center" justify="space-between" gap={10}>
                    <Typography.Title level={3}>
                        {v.date} • {v.time}
                    </Typography.Title>

                    <Flex align="center" gap={6}>
                        <span className={`statusPill ${isConfirmedByPatient ? "status--ok" : ""}`}>
                            {v.status}
                        </span>
                        {isConfirmedByPatient ? (
                            <span className="statusApprovedMark" aria-label="Подтверждено пациентом">
                                <span className="statusApprovedMarkIcon" aria-hidden="true">✓</span>
                            </span>
                        ) : null}
                    </Flex>
                </Flex>

                <div className="visitLine">
                    <Typography.Label>Врач</Typography.Label>
                    <Typography.Label>
                        {v.spec} • {v.doctor}
                    </Typography.Label>
                </div>

                <div className="visitLine">
                    <Typography.Label>Место</Typography.Label>
                    <Typography.Label>
                        {v.clinic}, {v.place}
                    </Typography.Label>
                </div>

                <Flex gap={8} className="visitActions">
                    {shouldShowConfirmButton && (
                        <Button onClick={() => onConfirm(v.id)} disabled={isBusy}>
                            Подтвердить
                        </Button>
                    )}

                    <Button
                        mode="secondary"
                        onClick={() => onReschedule(v)}
                        disabled={isBusy}
                    >
                        Перенести
                    </Button>

                    <Button
                        mode="secondary"
                        className="dangerBtn"
                        onClick={() => onCancel(v.id)}
                        disabled={isBusy}
                    >
                        Отменить
                    </Button>
                </Flex>
            </Flex>
        </Container>
    );
}

export default function MyVisits() {
    const nav = useNavigate();
    const accessToken = getStoredAccessToken();

    const [visits, setVisits] = useState([]);
    const [cancelDialogVisitId, setCancelDialogVisitId] = useState(null);
    const [pendingVisitId, setPendingVisitId] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadAppointments() {
        try {
            setLoading(true);
            setError("");

            if (!accessToken) {
                setVisits([]);
                return;
            }

            const response = await getAppointments(accessToken);
            const items = Array.isArray(response?.items) ? response.items : [];
            setVisits(items.map(normalizeAppointment));
        } catch {
            setError("Не удалось загрузить записи");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasVisits = useMemo(() => visits.length > 0, [visits]);

    async function confirmVisit(id) {
        if (!accessToken) return;

        try {
            setPendingVisitId(id);
            setError("");
            await updateAppointment(accessToken, {
                appointmentId: id,
                isApproved: true,
            });

            setVisits((prev) => prev.map((visit) => (
                visit.id === id
                    ? { ...visit, isApproved: true, status: visit.status || "Подтверждена" }
                    : visit
            )));
        } catch {
            setError("Не удалось подтвердить запись");
        } finally {
            setPendingVisitId("");
        }
    }

    function openCancelDialog(id) {
        setCancelDialogVisitId(id);
    }

    function closeCancelDialog() {
        setCancelDialogVisitId(null);
    }

    async function confirmCancelVisit() {
        if (!cancelDialogVisitId || !accessToken) {
            return;
        }

        try {
            setPendingVisitId(cancelDialogVisitId);
            setError("");
            await updateAppointment(accessToken, {
                appointmentId: cancelDialogVisitId,
                isCanceled: true,
            });
            setVisits((prev) => prev.filter((visit) => visit.id !== cancelDialogVisitId));
            closeCancelDialog();
        } catch {
            setError("Не удалось отменить запись");
        } finally {
            setPendingVisitId("");
        }
    }

    function rescheduleVisit(visit) {
        const params = new URLSearchParams({
            appointmentId: visit.id,
            specializationId: visit.specializationId,
            doctorId: visit.doctorId,
        });
        nav(`/book?${params.toString()}`);
    }

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText="Вернуться на главную"
            onBottomButtonClick={() => { nav("/"); }}
        >
            <Flex direction="column" gap={10}>
                <CellHeader titleStyle="caps">Мои записи</CellHeader>

                {loading ? <MyVisitsSkeleton /> : null}

                {!loading && error ? (
                    <Container className="card">
                        <Typography.Label>{error}</Typography.Label>
                    </Container>
                ) : null}

                {!loading && !error && !hasVisits ? (
                    <EmptyStateCard
                        icon={CalendarClock}
                        title="Пока нет записей на приём"
                        description="Запишитесь на удобное время — запись появится здесь сразу после подтверждения."
                        primaryAction={{
                            label: "Записаться на приём",
                            onClick: () => nav("/book"),
                        }}
                    />
                ) : null}

                {!loading && !error && hasVisits ? (
                    visits.map((v) => (
                        <VisitCard
                            key={v.id}
                            v={v}
                            pendingId={pendingVisitId}
                            onConfirm={confirmVisit}
                            onCancel={openCancelDialog}
                            onReschedule={rescheduleVisit}
                        />
                    ))
                ) : null}
            </Flex>

            <QuestionDialog
                open={Boolean(cancelDialogVisitId)}
                question="Вы уверены что хотите отменить запись на прием?"
                onCancel={closeCancelDialog}
                onConfirm={confirmCancelVisit}
                cancelText="Нет"
                confirmText="Да, отменить"
                confirmMode="secondary"
                confirmClassName="dangerBtn"
            />
        </PageLayout>
    );
}
