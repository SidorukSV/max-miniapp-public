export function toRuDate(dateISO) {
    const dateObj = new Date(dateISO);
    if (Number.isNaN(dateObj.valueOf())) return "";
    return dateObj.toLocaleDateString("ru-RU");
}

export function toRuTime(dateISO) {
    const dateObj = new Date(dateISO);
    if (Number.isNaN(dateObj.valueOf())) return "";
    return dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function getTimeMinutes(dateISO) {
    const match = String(dateISO || "").match(/T(\d{2}):(\d{2})/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
}

export function minutesToTime(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    return `${hours}:${mins}`;
}

export function buildSlotsByShifts(rows, doctorDuration, selectedDate) {
    const duration = Number(doctorDuration || 0);
    if (!duration || !selectedDate || !Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const workIntervals = [];
    const blockedIntervals = [];

    for (const row of rows) {
        const start = getTimeMinutes(row?.time_begin);
        const end = getTimeMinutes(row?.time_end);
        if (start === null || end === null || end <= start) {
            continue;
        }

        if (row?.isWorkTime) {
            workIntervals.push({ start, end, cabinetId: row?.cabinetId, cabinetTitle: row?.cabinetTitle });
        } else {
            blockedIntervals.push({ start, end });
        }
    }

    const slots = [];
    for (const work of workIntervals) {
        for (let start = work.start; start + duration <= work.end; start += duration) {
            const slotEnd = start + duration;
            const intersectsBlocked = blockedIntervals.some((blocked) => start < blocked.end && slotEnd > blocked.start);
            if (intersectsBlocked) {
                continue;
            }

            const time = minutesToTime(start);
            const value = `${selectedDate}T${time}:00`;
            slots.push({
                value,
                title: toRuTime(value),
                cabinetId: work.cabinetId,
                cabinetTitle: work.cabinetTitle,
            });
        }
    }

    const unique = new Map();
    for (const slot of slots) {
        unique.set(slot.value, slot);
    }

    return Array.from(unique.values()).sort((a, b) => new Date(a.value) - new Date(b.value));
}

export function normalizeDateValue(item) {
    if (typeof item === "string") {
        return item;
    }

    if (item && typeof item === "object") {
        return item.date || item.value || "";
    }

    return "";
}

export function getDoctorLabel(doctor) {
    return [doctor?.doctorLastname, doctor?.doctorFirstname, doctor?.doctorPatronymic].filter(Boolean).join(" ") || doctor?.doctorTitle || "Врач";
}

export function getMonthStart(value) {
    const baseDate = value ? new Date(value) : new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

export function formatMonthLabel(dateValue) {
    return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(dateValue);
}

export function buildMonthGrid(monthStart) {
    const monthStartDay = monthStart.getDay();
    const mondayStartOffset = monthStartDay === 0 ? 6 : monthStartDay - 1;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - mondayStartOffset);

    return Array.from({ length: 42 }, (_, index) => {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        return day;
    });
}

export function toISODateOnly(dateValue) {
    return dateValue.toLocaleDateString("sv");
}
