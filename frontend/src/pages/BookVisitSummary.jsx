import { useLocation, useNavigate } from "react-router-dom";
import { Button, Container, Flex, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";

export default function BookVisitSummary() {
    const nav = useNavigate();
    const { state } = useLocation();
    const summary = state?.summary;
    const mode = state?.mode;

    return (
        <PageLayout
            showBottom={true}
            bottomButtonText="К моим записям"
            onBottomButtonClick={() => nav("/visits")}
        >
            <Flex direction="column" gap={10}>
                <Container className="card">
                    <Typography.Title level={2}>
                        {mode === "reschedule" ? "Запись перенесена" : "Запись создана"}
                    </Typography.Title>
                    <Typography.Label style={{ marginTop: 8 }}>
                        Проверьте детали записи
                    </Typography.Label>

                    <div className="summary" style={{ marginTop: 12 }}>
                        <div className="summaryRow">
                            <Typography.Label>Специальность</Typography.Label>
                            <Typography.Label>{summary?.specialization || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Врач</Typography.Label>
                            <Typography.Label>{summary?.doctor || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Филиал</Typography.Label>
                            <Typography.Label>{summary?.branch || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Кабинет</Typography.Label>
                            <Typography.Label>{summary?.cabinet || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Дата</Typography.Label>
                            <Typography.Label>{summary?.date || "—"}</Typography.Label>
                        </div>
                        <div className="summaryRow">
                            <Typography.Label>Время</Typography.Label>
                            <Typography.Label>{summary?.time || "—"}</Typography.Label>
                        </div>
                    </div>

                    <Button mode="secondary" style={{ marginTop: 12, width: "100%" }} onClick={() => nav("/")}>
                        На главную
                    </Button>
                </Container>
            </Flex>
        </PageLayout>
    );
}
