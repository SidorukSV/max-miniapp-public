export function toDateLabel(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "Без даты";
  return dateObj.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export function toShortDateLabel(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "Без даты";
  return dateObj.toLocaleDateString("ru-RU");
}

export function toTimeLabel(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "--:--";
  return dateObj.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeAppointment(item, index = 0) {
  const sourceDate = item?.datetimeBegin || item?.appointment_date || "";
  const dateObj = sourceDate ? new Date(sourceDate) : null;
  const isValidDate = dateObj instanceof Date && !Number.isNaN(dateObj.valueOf());

  return {
    id: item?.appointment_id || item?.appointmentId || item?.id || `appointment-${index}`,
    dateObj: isValidDate ? dateObj : null,
    datetimeMs: isValidDate ? dateObj.getTime() : 0,
    dateLabel: isValidDate ? toDateLabel(dateObj) : "Без даты",
    dateShortLabel: isValidDate ? toShortDateLabel(dateObj) : "Без даты",
    timeLabel: isValidDate ? toTimeLabel(dateObj) : "--:--",
    doctor: [item?.doctorLastname, item?.doctorFirstname, item?.doctorPatronimic, item?.doctorPatronymic]
      .filter(Boolean)
      .join(" ") || "Врач не указан",
    doctorId: item?.doctorId || "",
    spec: item?.specializationTitle || "Специализация не указана",
    specializationId: item?.specializationId || "",
    branchId: item?.branchId || "",
    place: item?.cabinetTitle || "Кабинет не указан",
    clinic: item?.branchTitle || "Филиал не указан",
    status: item?.conditionTitle || "Запись",
    isApproved: item?.isApproved,
  };
}

export function buildRescheduleUrl(visit) {
  const params = new URLSearchParams({
    appointmentId: visit.id,
    specializationId: visit.specializationId || "",
    doctorId: visit.doctorId || "",
  });

  if (visit.branchId) params.set("branchId", visit.branchId);

  return `/book/flow?${params.toString()}`;
}
