import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button, CellHeader } from "../components/ui.jsx";
import { BranchInfoRow, DoctorInfoRow } from "../components/VisitInfoRows.jsx";
import PageLayout from "../components/PageLayout";
import QuestionDialog from "../components/QuestionDialog";
import { getAppointments, getStoredAccessToken, updateAppointment } from "../api";
import { buildRescheduleUrl, normalizeAppointment } from "../modules/appointmentView.js";
import "../App.css";
import MyVisitsSkeleton from "../components/my-visits/MyVisitsSkeleton.jsx";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import { CalendarClock } from "lucide-react";

function stopAndRun(event, action) {
    event.stopPropagation();
    action();
}

function VisitCard({ v, pendingId, onOpen, onConfirm, onCancel, onReschedule }) {
    const isConfirmedByPatient = v.isApproved === true;
    const canBeConfirmedByPatient = v.isApproved !== undefined;
    const shouldShowConfirmButton = canBeConfirmedByPatient && !isConfirmedByPatient;
    const isBusy = pendingId === v.id;

    return (
        <Container className="card visitCardClickable" onClick={() => onOpen(v)}>
            <Flex direction="column" gap={12}>
                <Flex align="center" justify="space-between" gap={10}>
                    <Typography.Title level={3}>
                        {v.dateShortLabel} • {v.timeLabel}
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

                <DoctorInfoRow doctor={v.doctor} specialization={v.spec} />
                <BranchInfoRow clinic={v.clinic} place={v.place} />

                <Flex gap={8} className="visitActions">
                    {shouldShowConfirmButton && (
                        <Button onClick={(event) => stopAndRun(event, () => onConfirm(v.id))} disabled={isBusy}>
                            Подтвердить
                        </Button>
                    )}

                    <Button
                        mode="secondary"
                        onClick={(event) => stopAndRun(event, () => onReschedule(v))}
                        disabled={isBusy}
                    >
                        Перенести
                    </Button>

                    <Button
                        mode="secondary"
                        className="dangerBtn"
                        onClick={(event) => stopAndRun(event, () => onCancel(v.id))}
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
        nav(buildRescheduleUrl(visit));
    }

    function openVisitDetails(visit) {
        nav(`/visits/${encodeURIComponent(visit.id)}`, { state: { visit } });
    }

    return (
        <PageLayout
            showBottom
            headerTitle="Мои записи"
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
                            onOpen={openVisitDetails}
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
