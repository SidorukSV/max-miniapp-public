import { Container, Typography } from "@maxhub/max-ui";
import DateCalendar from "./DateCalendar.jsx";
import CalendarSkeleton from "./skeletons/CalendarSkeleton.jsx";

export default function DateSection({
    doctorId,
    isLoading,
    monthTitle,
    onPrevMonth,
    onNextMonth,
    monthGrid,
    monthCursor,
    availableDates,
    selectedDate,
    onPickDate,
}) {
    return (
        <Container className={`card ${doctorId ? "" : "card--disabled"}`}>
            <Typography.Title level={3}>Дата</Typography.Title>
            {isLoading ? <CalendarSkeleton /> : (
                <div aria-disabled={!doctorId}>
                    <DateCalendar
                        monthTitle={monthTitle}
                        monthGrid={monthGrid}
                        monthCursor={monthCursor}
                        onPrevMonth={onPrevMonth}
                        onNextMonth={onNextMonth}
                        selectedDate={selectedDate}
                        availableDates={availableDates}
                        onPickDate={onPickDate}
                    />
                </div>
            )}
        </Container>
    );
}
