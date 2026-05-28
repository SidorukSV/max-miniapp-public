import { toISODateOnly } from "../../modules/bookVisitHelpers";

const WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export default function DateCalendar({
    monthTitle,
    monthGrid,
    monthCursor,
    onPrevMonth,
    onNextMonth,
    selectedDate,
    availableDates,
    onPickDate,
}) {
    return (
        <div className="calendar">
            <div className="calendarHeader">
                <span className="calendarTitle">{monthTitle}</span>
                <div className="calendarNav">
                    <button type="button" className="calendarArrow" onClick={onPrevMonth} aria-label="Предыдущий месяц">
                        ‹
                    </button>
                    <button type="button" className="calendarArrow" onClick={onNextMonth} aria-label="Следующий месяц">
                        ›
                    </button>
                </div>
            </div>

            <div className="calendarWeekdays">
                {WEEK_DAYS.map((dayLabel) => (
                    <span key={dayLabel}>{dayLabel}</span>
                ))}
            </div>

            <div className="calendarGrid">
                {monthGrid.map((gridDate) => {
                    const isoDay = toISODateOnly(gridDate);
                    const isCurrentMonth = gridDate.getMonth() === monthCursor.getMonth();
                    const isAvailable = availableDates.has(isoDay);
                    const isSelected = selectedDate === isoDay;

                    return (
                        <button
                            key={isoDay}
                            type="button"
                            className={`calendarDay ${isCurrentMonth ? "" : "calendarDay--outside"} ${isAvailable ? "calendarDay--available" : ""} ${isSelected ? "calendarDay--selected" : ""}`}
                            onClick={() => onPickDate(isoDay)}
                            disabled={!isAvailable}
                        >
                            {gridDate.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
