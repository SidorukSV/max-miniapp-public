import { format } from "date-fns";

export function dateISOFormat(dateISO, dateFormat) {
    const date = new Date(dateISO);
    return format(date, dateFormat);
}