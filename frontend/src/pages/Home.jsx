import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, ChevronRight, Mail, RotateCcw, X } from "lucide-react";
import PageLayout from "../components/PageLayout.jsx";
import AuthScreen from "../components/AuthScreen.jsx";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import QuestionDialog from "../components/QuestionDialog.jsx";
import { HomeLoadingCard } from "../components/loadingCard.jsx";
import { Avatar, Button, Card, IconButton, Stack, Typography } from "../components/ui.jsx";
import { BranchInfoRow, DoctorInfoRow } from "../components/VisitInfoRows.jsx";
import { getAppointments, getStoredAccessToken, getSurveys, updateAppointment } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { buildRescheduleUrl, normalizeAppointment } from "../modules/appointmentView.js";
import { getFallbackGradientByInitials } from "../modules/avatarGradient.js";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function getFirstName(fullName) {
  return String(fullName || "Пациент").trim().split(/\s+/)[1] || String(fullName || "Пациент").trim().split(/\s+/)[0] || "Пациент";
}

function toRuDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "без даты";
  return parsed.toLocaleDateString("ru-RU");
}

function normalizeSurvey(item, index) {
  return {
    id: item?.surveyId || `survey-${index}`,
    title: item?.surveyTemplateTitle || "Анкета",
    dateLabel: toRuDate(item?.surveyDate),
    isDone: Boolean(item?.isDone),
  };
}

function stopAndRun(event, action) {
  event.stopPropagation();
  action();
}

function AppointmentCard({ visit, onOpen, onReschedule, onCancel }) {
  return (
    <Card className="visitCardClickable" onClick={() => onOpen(visit)}>
      <div className="appointmentHero">
        <div className="appointmentHero__icon" aria-hidden="true">
          <CalendarDays size={34} />
        </div>
        <Stack gap={8}>
          <Typography.Title level={2}>
            {visit.dateLabel}, {visit.timeLabel}
          </Typography.Title>
          <DoctorInfoRow doctor={visit.doctor} specialization={visit.spec} />
          <BranchInfoRow clinic={visit.clinic} place={visit.place} />
        </Stack>
        <div className="appointmentActions">
          <Button onClick={(event) => stopAndRun(event, () => onReschedule(visit))}>
            <RotateCcw size={18} />
            Перенести
          </Button>
          <Button mode="secondary" className="dangerBtn" onClick={(event) => stopAndRun(event, () => onCancel(visit.id))}>
            <X size={18} />
            Отменить
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MiniVisitCard({ visit, onOpen, onReschedule }) {
  return (
    <Card className="miniVisitCard visitCardClickable" onClick={() => onOpen(visit)}>
      <Stack gap={8}>
        <Typography.Title level={3}>
          {visit.dateLabel}, {visit.timeLabel}
        </Typography.Title>
        <DoctorInfoRow doctor={visit.doctor} specialization={visit.spec} />
        <BranchInfoRow clinic={visit.clinic} place={visit.place} />
      </Stack>
      <div className="miniVisitCard__actions">
        <Button mode="secondary" onClick={(event) => stopAndRun(event, () => onReschedule(visit))}>
          Перенести
        </Button>
      </div>
    </Card>
  );
}

export default function Home() {
  const nav = useNavigate();
  const { me, loading, isAuthorized } = useAuth();
  const accessToken = getStoredAccessToken();
  const [appointments, setAppointments] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelDialogVisitId, setCancelDialogVisitId] = useState(null);
  const [pendingVisitId, setPendingVisitId] = useState("");

  const username = me?.fullName || "Пациент";
  const firstName = getFirstName(username);
  const initials = username
    .trim()
    .split(/\s+/, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const newSurveysCount = surveys.filter((item) => !item.isDone).length;

  async function loadHomeData() {
    if (!accessToken) {
      setAppointments([]);
      setSurveys([]);
      setContentLoading(false);
      return;
    }

    try {
      setContentLoading(true);
      setError("");
      const [appointmentsResponse, surveysResponse] = await Promise.allSettled([
        getAppointments(accessToken),
        getSurveys(accessToken),
      ]);

      if (appointmentsResponse.status === "fulfilled") {
        const items = Array.isArray(appointmentsResponse.value?.items) ? appointmentsResponse.value.items : [];
        setAppointments(items.map(normalizeAppointment).sort((a, b) => a.datetimeMs - b.datetimeMs));
      } else {
        setAppointments([]);
      }

      if (surveysResponse.status === "fulfilled") {
        const items = Array.isArray(surveysResponse.value?.items) ? surveysResponse.value.items : [];
        setSurveys(items.map(normalizeSurvey));
      } else {
        setSurveys([]);
      }
    } catch {
      setError("Не удалось загрузить данные главной");
    } finally {
      setContentLoading(false);
    }
  }

  useEffect(() => {
    loadHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const nearestAppointment = useMemo(() => {
    const now = Date.now();
    const future = appointments.filter((item) => item.datetimeMs >= now);
    return future[0] || appointments[0] || null;
  }, [appointments]);

  function rescheduleVisit(visit) {
    nav(buildRescheduleUrl(visit));
  }

  function openVisitDetails(visit) {
    nav(`/visits/${encodeURIComponent(visit.id)}`, { state: { visit } });
  }

  async function confirmCancelVisit() {
    if (!cancelDialogVisitId || !accessToken) return;

    try {
      setPendingVisitId(cancelDialogVisitId);
      setError("");
      await updateAppointment(accessToken, {
        appointmentId: cancelDialogVisitId,
        isCanceled: true,
      });
      setAppointments((prev) => prev.filter((visit) => visit.id !== cancelDialogVisitId));
      setCancelDialogVisitId(null);
    } catch {
      setError("Не удалось отменить запись");
    } finally {
      setPendingVisitId("");
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <HomeLoadingCard />
      </PageLayout>
    );
  }

  if (!isAuthorized) {
    return <AuthScreen />;
  }

  return (
    <PageLayout>
      <Stack gap={20}>
        <section className="profilePreview">
          <div className="profilePreview__main">
            <Avatar.Container size={58}>
              <Avatar.Image
                fallback={initials}
                fallbackGradient={getFallbackGradientByInitials(initials, me?.patient_id || username)}
              />
            </Avatar.Container>
            <div className="greetingBlock">
              <Typography.Title level={2}>
                {getGreeting()}, {firstName}
              </Typography.Title>
              <Typography.Label>Как ваше самочувствие сегодня?</Typography.Label>
            </div>
          </div>
          <div className="profilePreview__actions">
            <IconButton className="notificationButton" onClick={() => nav("/surveys")} aria-label="Открыть сообщения">
              <Bell size={25} />
              {newSurveysCount > 0 ? <span className="notificationBadge">{newSurveysCount}</span> : null}
            </IconButton>
          </div>
        </section>

        {error ? <Typography.Label className="authErrorLabel">{error}</Typography.Label> : null}

        <Stack gap={12}>
          <Typography.Title level={2}>Ближайший приём</Typography.Title>
          {contentLoading ? (
            <div className="skeleton skeleton--tx" />
          ) : nearestAppointment ? (
            <AppointmentCard
              visit={nearestAppointment}
              onOpen={openVisitDetails}
              onReschedule={rescheduleVisit}
              onCancel={(id) => setCancelDialogVisitId(id)}
              pendingId={pendingVisitId}
            />
          ) : (
            <EmptyStateCard
              icon={CalendarDays}
              title="Записей пока нет"
              description="Новая запись появится здесь после подтверждения."
              primaryAction={{
                label: "Записаться",
                onClick: () => nav("/book"),
              }}
            />
          )}
        </Stack>

        {appointments.length > 0 ? (
          <Stack gap={12}>
            <div className="sectionHeaderRow">
              <Typography.Title level={2}>Записи</Typography.Title>
              <button type="button" className="sectionLink" onClick={() => nav("/visits")}>
                Все
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="pageWideScroll">
              <div className="horizontalCards">
                {appointments.slice(0, 6).map((visit) => (
                  <MiniVisitCard
                    key={visit.id}
                    visit={visit}
                    onOpen={openVisitDetails}
                    onReschedule={rescheduleVisit}
                  />
                ))}
              </div>
            </div>
          </Stack>
        ) : null}

        <Stack gap={12}>
          <div className="sectionHeaderRow">
            <Typography.Title level={2}>Сообщения</Typography.Title>
            <button type="button" className="sectionLink" onClick={() => nav("/surveys")}>
              Все сообщения
              <ChevronRight size={18} />
            </button>
          </div>
          <Card className="messageCard">
            {contentLoading ? (
              <>
                <div className="skeletonRow" />
                <div className="skeletonRow" />
              </>
            ) : surveys.length ? (
              surveys.slice(0, 2).map((survey) => (
                <button
                  key={survey.id}
                  type="button"
                  className="cellRow"
                  onClick={() => nav(`/surveys/${survey.id}`)}
                >
                  <span className="cellRow__before">
                    <Mail size={22} />
                  </span>
                  <span className="cellRow__body">
                    <span className="cellRow__title">{survey.title}</span>
                    <span className="cellRow__subtitle">{survey.dateLabel}</span>
                  </span>
                  {!survey.isDone ? <span className="notificationBadge">1</span> : null}
                  <ChevronRight className="cellRow__chevron" size={20} />
                </button>
              ))
            ) : (
              <div className="cellRow">
                <span className="cellRow__before">
                  <Mail size={22} />
                </span>
                <span className="cellRow__body">
                  <span className="cellRow__title">Анкет пока нет</span>
                  <span className="cellRow__subtitle">Новые анкеты появятся здесь</span>
                </span>
              </div>
            )}
          </Card>
        </Stack>
      </Stack>

      <QuestionDialog
        open={Boolean(cancelDialogVisitId)}
        question="Вы уверены, что хотите отменить запись?"
        onCancel={() => setCancelDialogVisitId(null)}
        onConfirm={confirmCancelVisit}
        cancelText="Нет"
        confirmText={pendingVisitId ? "Отменяем..." : "Да, отменить"}
        confirmMode="secondary"
        confirmClassName="dangerBtn"
      />
    </PageLayout>
  );
}
