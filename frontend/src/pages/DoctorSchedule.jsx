import { useEffect, useMemo, useState } from "react";
import AuthScreen from "../components/AuthScreen.jsx";
import PageLayout from "../components/PageLayout.jsx";
import { Card, Input, Stack, Typography } from "../components/ui.jsx";
import { getDoctorWorkplaceSchedule, getStoredAccessToken } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function timeOf(value) {
  if (!value) return "—";
  const match = String(value).match(/(?:T|\s)(\d{2}:\d{2})/);
  return match?.[1] || String(value).slice(0, 5);
}

export default function DoctorSchedule() {
  const { me, loading, isAuthorized } = useAuth();
  const [date, setDate] = useState(todayIso);
  const [data, setData] = useState({ shifts: [], appointments: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (me?.actor_type !== "employee") return;
    const accessToken = getStoredAccessToken();
    if (!accessToken) return;

    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setBusy(true);
        setError("");
        return getDoctorWorkplaceSchedule(accessToken, date);
      })
      .then((result) => {
        if (!active || !result) return;
        setData({
          shifts: Array.isArray(result?.shifts) ? result.shifts : [],
          appointments: Array.isArray(result?.appointments) ? result.appointments : [],
        });
      })
      .catch(() => {
        if (active) {
          setData({ shifts: [], appointments: [] });
          setError("Не удалось загрузить расписание.");
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
    };
  }, [date, me?.actor_type]);

  const appointments = useMemo(() => [...data.appointments].sort((a, b) =>
    String(a.datetimeBegin || "").localeCompare(String(b.datetimeBegin || ""))), [data.appointments]);

  if (loading) return <PageLayout headerTitle="Расписание"><div className="skeleton skeleton--tx" /></PageLayout>;
  if (!isAuthorized) return <AuthScreen />;
  if (me?.actor_type !== "employee") return <PageLayout headerTitle="Расписание"><Typography.Label>Рабочее место доступно только врачу.</Typography.Label></PageLayout>;

  return (
    <PageLayout headerTitle="Рабочее место врача">
      <Stack gap={14}>
        <div>
          <Typography.Title level={1}>Расписание</Typography.Title>
          <Typography.Label>{me.fullName}</Typography.Label>
        </div>

        <Card>
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Card>

        <Card>
          <Stack gap={8}>
            <Typography.Title level={3}>Смена</Typography.Title>
            {data.shifts.length ? data.shifts.map((shift, index) => (
              <div className="doctorShift" key={`${shift.branchId}-${shift.time_begin}-${index}`}>
                <strong>{timeOf(shift.time_begin)}–{timeOf(shift.time_end)}</strong>
                <span>{shift.branchTitle || "Филиал не указан"}</span>
                {shift.cabinetTitle ? <span>{shift.cabinetTitle}</span> : null}
              </div>
            )) : <Typography.Label>{busy ? "Загружаем..." : "Смена не назначена"}</Typography.Label>}
          </Stack>
        </Card>

        <Stack gap={10}>
          <Typography.Title level={3}>Текущие заявки — {appointments.length}</Typography.Title>
          {appointments.map((appointment, index) => (
            <Card key={`${appointment.appointment_id}-${appointment.serviceId || index}`}>
              <div className="doctorAppointment">
                <div className="doctorAppointment__time">
                  {timeOf(appointment.datetimeBegin)}–{timeOf(appointment.datetimeEnd)}
                </div>
                <div className="doctorAppointment__body">
                  <strong>{appointment.patientTitle || "Пациент не указан"}</strong>
                  <span>{appointment.serviceTitle || appointment.specializationTitle || "Приём"}</span>
                  <span>{appointment.conditionTitle || "Статус не указан"}</span>
                  {appointment.branchTitle ? <span>{appointment.branchTitle}</span> : null}
                </div>
              </div>
            </Card>
          ))}
          {!busy && !appointments.length ? <Typography.Label>На выбранную дату заявок нет.</Typography.Label> : null}
          {error ? <Typography.Label className="authErrorLabel">{error}</Typography.Label> : null}
        </Stack>
      </Stack>
    </PageLayout>
  );
}
