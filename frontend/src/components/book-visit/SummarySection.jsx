import { Container, Typography } from "@maxhub/max-ui";

export default function SummarySection({
    specialization,
    doctor,
    date,
    time,
    cabinet,
}) {
    return (
        <Container className="card">
            <Typography.Title level={3}>Итог</Typography.Title>
            <div className="summary">
                <div className="summaryRow">
                    <Typography.Label>Специальность</Typography.Label>
                    <Typography.Label>{specialization}</Typography.Label>
                </div>
                <div className="summaryRow">
                    <Typography.Label>Врач</Typography.Label>
                    <Typography.Label>{doctor}</Typography.Label>
                </div>
                <div className="summaryRow">
                    <Typography.Label>Дата</Typography.Label>
                    <Typography.Label>{date}</Typography.Label>
                </div>
                <div className="summaryRow">
                    <Typography.Label>Время</Typography.Label>
                    <Typography.Label>{time}</Typography.Label>
                </div>
                <div className="summaryRow">
                    <Typography.Label>Кабинет</Typography.Label>
                    <Typography.Label>{cabinet}</Typography.Label>
                </div>
            </div>
        </Container>
    );
}
