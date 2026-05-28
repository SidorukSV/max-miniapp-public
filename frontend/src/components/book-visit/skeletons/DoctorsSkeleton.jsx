import PillsSkeleton from "./PillsSkeleton.jsx";

export default function DoctorsSkeleton() {
    return (
        <div className="bookVisitSkeletonDoctors">
            <div className="skeleton bookVisitSkeleton bookVisitSkeleton--label" />
            <PillsSkeleton count={4} />
            <div className="skeleton bookVisitSkeleton bookVisitSkeleton--label" />
            <PillsSkeleton count={3} />
        </div>
    );
}
