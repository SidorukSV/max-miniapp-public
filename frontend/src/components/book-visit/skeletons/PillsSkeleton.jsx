export default function PillsSkeleton({ count, itemClassName = "" }) {
    return (
        <div className="bookVisitSkeletonPills">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className={`skeleton bookVisitSkeleton bookVisitSkeleton--pill ${itemClassName}`.trim()}
                />
            ))}
        </div>
    );
}
