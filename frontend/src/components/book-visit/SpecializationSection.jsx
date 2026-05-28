import { Container, Typography } from "@maxhub/max-ui";
import Pill from "./Pill.jsx";
import SpecializationsSkeleton from "./skeletons/SpecializationsSkeleton.jsx";

export default function SpecializationSection({
    specialties,
    specId,
    onPickSpec,
    isLoading,
    isRescheduleMode,
}) {
    return (
        <Container className="card">
            <Typography.Title level={3}>Специальность</Typography.Title>
            {isLoading ? <SpecializationsSkeleton /> : (
                <div className="pills">
                    {specialties.map((item) => (
                        <Pill
                            key={item.id}
                            active={specId === item.id}
                            onClick={() => onPickSpec(item.id)}
                            disabled={isRescheduleMode}
                        >
                            {item.title}
                        </Pill>
                    ))}
                </div>
            )}
        </Container>
    );
}
