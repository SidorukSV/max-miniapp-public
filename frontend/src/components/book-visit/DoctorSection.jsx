import { Container, Flex, Typography } from "@maxhub/max-ui";
import Pill from "./Pill.jsx";
import DoctorsSkeleton from "./skeletons/DoctorsSkeleton.jsx";
import { getDoctorLabel } from "../../modules/bookVisitHelpers";

export default function DoctorSection({
    specId,
    isLoading,
    doctorsByBranch,
    doctorId,
    branchId,
    onPickDoctor,
    isRescheduleMode,
}) {
    return (
        <Container className={`card ${specId ? "" : "card--disabled"}`}>
            <Typography.Title level={3}>Врач</Typography.Title>
            {isLoading ? <DoctorsSkeleton /> : !specId ? (
                <Typography.Label style={{ marginTop: 8 }}>Сначала выберите специальность</Typography.Label>
            ) : (
                <Flex direction="column" gap={10} style={{ marginTop: 12 }}>
                    {doctorsByBranch.map((branch) => (
                        <div key={branch.branchId}>
                            <Typography.Label>{branch.branchTitle}</Typography.Label>
                            <div className="pills">
                                {branch.doctors.map((doc) => (
                                    <Pill
                                        key={`${doc.branchId}:${doc.doctorId}`}
                                        active={doctorId === doc.doctorId && branchId === doc.branchId}
                                        onClick={() => onPickDoctor(doc.doctorId, doc.branchId)}
                                        disabled={isRescheduleMode}
                                    >
                                        {getDoctorLabel(doc)}
                                    </Pill>
                                ))}
                            </div>
                        </div>
                    ))}
                </Flex>
            )}
        </Container>
    );
}
