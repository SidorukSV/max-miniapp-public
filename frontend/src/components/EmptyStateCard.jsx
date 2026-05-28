import { Button, Flex, Typography } from "@maxhub/max-ui";
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
      <div className="emptyStateGlow" aria-hidden="true" />

      <div className="emptyStateIconWrap" aria-hidden="true">
        <IconComponent size={28} className="emptyStateIcon" />
      </div>

      <Flex direction="column" gap={8}>
        <Typography.Title level={3}>{title}</Typography.Title>
        {description ? <Typography.Label>{description}</Typography.Label> : null}
      </Flex>

      {primaryAction || secondaryAction ? (
        <Flex direction="column" gap={8} className="emptyStateActions">
          {primaryAction ? (
            <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          ) : null}

          {secondaryAction ? (
            <Button mode="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </Flex>
      ) : null}
    </div>
  );
}
