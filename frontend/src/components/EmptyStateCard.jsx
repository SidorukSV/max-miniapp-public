import { Button, Stack, Typography } from "./ui.jsx";
import { Sparkles } from "lucide-react";
import "../App.css";

export default function EmptyStateCard({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) {
  const IconComponent = icon || Sparkles;

  return (
    <div className="emptyStateCard">
      <div className="emptyStateIconWrap" aria-hidden="true">
        <IconComponent size={28} />
      </div>

      <Stack gap={8}>
        <Typography.Title level={3}>{title}</Typography.Title>
        {description ? <Typography.Label>{description}</Typography.Label> : null}
      </Stack>

      {primaryAction || secondaryAction ? (
        <div className="emptyStateActions">
          {primaryAction ? (
            <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          ) : null}
          {secondaryAction ? (
            <Button mode="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
