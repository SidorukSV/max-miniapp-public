import { Container, Flex, Typography, Button } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout.jsx";
import SectionTitle from "../components/book-visit/SectionTitle.jsx";
import SpecializationSection from "../components/book-visit/SpecializationSection.jsx";
import DoctorSection from "../components/book-visit/DoctorSection.jsx";
import DateSection from "../components/book-visit/DateSection.jsx";
import TimeSection from "../components/book-visit/TimeSection.jsx";
import SummarySection from "../components/book-visit/SummarySection.jsx";
import useBookVisitFlow from "../hooks/useBookVisitFlow";
import { getDoctorLabel, toRuDate, toRuTime } from "../modules/bookVisitHelpers";
import "../App.css";

export default function BookVisit() {
    const { state, actions, loading, error } = useBookVisitFlow();

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText={loading.saving ? "Сохраняем..." : state.isRescheduleMode ? "Перенести запись" : "Подтвердить запись"}
            onBottomButtonClick={actions.onBottomButtonClick}
            before={state.showMissingWarning ? (
                <Typography.Label className="bookVisitWarning">
                    Чтобы продолжить, выберите специальность, врача, дату и время.
                </Typography.Label>
            ) : null}
            bottomButtonDisabled={loading.saving}
            showBottomButton={true}
        >
            <Flex direction="column" gap={10}>
                <SectionTitle
                    title={state.isRescheduleMode ? "Перенос записи" : "Запись на приём"}
                    subtitle="Выберите параметры приёма"
                />

                {!loading.times && error ? (
                    <Container className="card">
                        <Typography.Label>{error}</Typography.Label>
                    </Container>
                ) : null}

                <SpecializationSection
                    specialties={state.specialties}
                    specId={state.specId}
                    onPickSpec={actions.onPickSpec}
                    isLoading={loading.specialties}
                    isRescheduleMode={state.isRescheduleMode}
                />

                <DoctorSection
                    specId={state.specId}
                    isLoading={loading.doctors}
                    doctorsByBranch={state.doctorsByBranch}
                    doctorId={state.doctorId}
                    branchId={state.branchId}
                    onPickDoctor={actions.onPickDoctor}
                    isRescheduleMode={state.isRescheduleMode}
                />

                <DateSection
                    doctorId={state.doctorId}
                    isLoading={loading.dates}
                    monthTitle={state.monthTitle}
                    onPrevMonth={actions.onPrevMonth}
                    onNextMonth={actions.onNextMonth}
                    monthGrid={state.monthGrid}
                    monthCursor={state.monthCursor}
                    availableDates={state.availableDates}
                    selectedDate={state.date}
                    onPickDate={actions.onPickDate}
                />

                <TimeSection
                    date={state.date}
                    isLoading={loading.times}
                    groupedTimeSlots={state.groupedTimeSlots}
                    timeISO={state.timeISO}
                    onPickTime={actions.onPickTime}
                />

                <SummarySection
                    specialization={state.selectedSpecialty?.title || "—"}
                    doctor={getDoctorLabel(state.selectedDoctor) || "—"}
                    date={state.date ? toRuDate(state.date) : "—"}
                    time={state.timeISO ? toRuTime(state.timeISO) : "—"}
                    cabinet={state.selectedSlot?.cabinetTitle || "—"}
                />

                <Button mode="secondary" onClick={actions.goHome} stretched={true}>
                    Вернуться на главную
                </Button>
            </Flex>
        </PageLayout>
    );
}
