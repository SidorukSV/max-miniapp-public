import { Typography } from "@maxhub/max-ui";

export default function SectionTitle({ title, subtitle }) {
    return (
        <div className="pageTitle">
            <Typography.Title level={2}>{title}</Typography.Title>
            {subtitle ? <Typography.Label style={{ marginTop: 6 }}>{subtitle}</Typography.Label> : null}
        </div>
    );
}
