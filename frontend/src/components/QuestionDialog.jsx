import { Button, Card, Stack, Typography } from "./ui.jsx";

export default function QuestionDialog({
  open,
  question,
  onCancel,
  onConfirm,
  cancelText = "Нет",
  confirmText = "Да",
  cancelDisabled = false,
  confirmDisabled = false,
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
            <Button mode="secondary" onClick={onCancel} disabled={cancelDisabled}>
              {cancelText}
            </Button>
            <Button mode={confirmMode} onClick={onConfirm} className={confirmClassName} disabled={confirmDisabled}>
              {confirmText}
            </Button>
          </div>
        </Stack>
      </Card>
    </div>
  );
}
