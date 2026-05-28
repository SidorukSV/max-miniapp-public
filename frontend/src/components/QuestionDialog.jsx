import { Container, Flex, Typography, Button } from "@maxhub/max-ui";

export default function QuestionDialog({
    open,
    question,
    onCancel,
    onConfirm,
    cancelText = "Нет",
    confirmText = "Да",
    confirmMode = "secondary",
    confirmClassName = "",
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="questionDialogOverlay">
            <Container className="card questionDialogCard">
                <Flex direction="column" gap={16}>
                    <Typography.Title level={3}>{question}</Typography.Title>

                    <Flex gap={8} className="questionDialogActions">
                        <Button mode="secondary" onClick={onCancel} className="questionDialogBtn">
                            {cancelText}
                        </Button>
                        <Button mode={confirmMode} onClick={onConfirm} className={`questionDialogBtn ${confirmClassName}`.trim()}>
                            {confirmText}
                        </Button>
                    </Flex>
                </Flex>
            </Container>
        </div>
    );
}
