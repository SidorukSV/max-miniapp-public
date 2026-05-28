export default function CalendarSkeleton() {
    return (
        <div className="bookVisitSkeletonCalendar">
            <div className="bookVisitSkeletonCalendarHeader">
                <div className="skeleton bookVisitSkeleton bookVisitSkeleton--month" />
                <div className="bookVisitSkeletonNav">
                    <div className="skeleton bookVisitSkeleton bookVisitSkeleton--navBtn" />
                    <div className="skeleton bookVisitSkeleton bookVisitSkeleton--navBtn" />
                </div>
            </div>
            <div className="bookVisitSkeletonCalendarGrid">
                {Array.from({ length: 14 }).map((_, index) => (
                    <div key={index} className="skeleton bookVisitSkeleton bookVisitSkeleton--day" />
                ))}
            </div>
        </div>
    );
}
