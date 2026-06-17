import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Check, RotateCcw, X } from "lucide-react";
import PageLayout from "../components/PageLayout.jsx";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import QuestionDialog from "../components/QuestionDialog.jsx";
import { BranchInfoRow, DoctorInfoRow } from "../components/VisitInfoRows.jsx";
import { Button, Card, Flex, Stack, Typography } from "../components/ui.jsx";
import { getAppointments, getStoredAccessToken, updateAppointment } from "../api.js";
import { buildRescheduleUrl, normalizeAppointment } from "../modules/appointmentView.js";

export default function VisitDetails() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const { state } = useLocation();
  const accessToken = getStoredAccessToken();

  const decodedId = useMemo(() => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  }, [id]);

  const initialVisit = state?.visit && String(state.visit.id) === decodedId ? state.visit : null;
  const [visit, setVisit] = useState(initialVisit);
  const [loading, setLoading] = useState(!initialVisit);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    async function loadVisit() {
      if (!accessToken) {
        setError("Не найден токен авторизации");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await getAppointments(accessToken);
        const items = Array.isArray(response?.items) ? response.items : [];
        const normalized = items.map(normalizeAppointment);
        setVisit(normalized.find((item) => String(item.id) === decodedId) || null);
      } catch {
        setError("Не удалось загрузить запись");
      } finally {
        setLoading(false);
      }
    }

    loadVisit();
  }, [accessToken, decodedId]);

  async function confirmVisit() {
    if (!accessToken || !visit || visit.isApproved === true) return;

    try {
      setPendingAction("confirm");
      setError("");
      await updateAppointment(accessToken, {
        appointmentId: visit.id,
        isApproved: true,
      });
      setVisit((prev) => prev ? { ...prev, isApproved: true, status: prev.status || "Подтверждена" } : prev);
    } catch {
      setError("Не удалось подтвердить запись");
    } finally {
      setPendingAction("");
    }
  }

  function rescheduleVisit() {
    if (!visit) return;
    nav(buildRescheduleUrl(visit));
  }

  async function cancelVisit() {
    if (!accessToken || !visit) return;

    try {
      setPendingAction("cancel");
      setError("");
      await updateAppointment(accessToken, {
        appointmentId: visit.id,
        isCanceled: true,
      });
      setCancelDialogOpen(false);
      nav("/visits", { replace: true });
    } catch {
      setError("Не удалось отменить запись");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <PageLayout headerTitle="Детали записи">
      <Stack gap={14}>
        <Typography.Title level={2}>Детали записи</Typography.Title>

        {loading ? (
          <Card>
            <Stack gap={10}>
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--tx" />
              <div className="skeleton skeleton--tx" />
            </Stack>
          </Card>
        ) : null}

        {!loading && error ? <Typography.Label className="authErrorLabel">{error}</Typography.Label> : null}

        {!loading && !visit ? (
          <EmptyStateCard
            icon={CalendarDays}
            title="Запись не найдена"
            description="Возможно, она была отменена или уже недоступна."
            primaryAction={{
              label: "К моим записям",
              onClick: () => nav("/visits"),
            }}
          />
        ) : null}

        {!loading && visit ? (
          <Card className="visitDetailsCard">
            <Stack gap={14}>
              <Flex align="center" justify="space-between" gap={10}>
                <Typography.Title level={2}>
                  {visit.dateLabel}, {visit.timeLabel}
                </Typography.Title>
                <span className={`statusPill ${visit.isApproved === true ? "status--ok" : ""}`}>
                  {visit.status}
                </span>
              </Flex>

              <DoctorInfoRow doctor={visit.doctor} specialization={visit.spec} />
              <BranchInfoRow clinic={visit.clinic} place={visit.place} />

              <div className="visitDetailsActions">
                <Button onClick={confirmVisit} disabled={pendingAction === "confirm" || visit.isApproved === true}>
                  <Check size={17} />
                  Подтвердить
                </Button>
                <Button mode="secondary" onClick={rescheduleVisit} disabled={Boolean(pendingAction)}>
                  <RotateCcw size={17} />
                  Перенести
                </Button>
                <Button
                  mode="secondary"
                  className="dangerBtn"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={Boolean(pendingAction)}
                >
                  <X size={17} />
                  Отменить
                </Button>
              </div>
            </Stack>
          </Card>
        ) : null}
      </Stack>

      <QuestionDialog
        open={cancelDialogOpen}
        question="Вы уверены, что хотите отменить запись?"
        onCancel={() => setCancelDialogOpen(false)}
        onConfirm={cancelVisit}
        cancelText="Нет"
        confirmText={pendingAction === "cancel" ? "Отменяем..." : "Да, отменить"}
        confirmMode="secondary"
        confirmClassName="dangerBtn"
      />
    </PageLayout>
  );
}
