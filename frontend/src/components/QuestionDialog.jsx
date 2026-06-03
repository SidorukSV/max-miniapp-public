import { Button, Card, Stack, Typography } from "./ui.jsx";

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
  if (!open) return null;

  return (
    <div className="questionDialogOverlay">
      <Card className="questionDialogCard">
        <Stack gap={16}>
          <Typography.Title level={3}>{question}</Typography.Title>
          <div className="questionDialogActions">
            <Button mode="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button mode={confirmMode} onClick={onConfirm} className={confirmClassName}>
              {confirmText}
            </Button>
          </div>
        </Stack>
      </Card>
    </div>
  );
}
