import { Container } from "@maxhub/max-ui";

function VisitSkeletonCard() {
    return (
        <Container className="card loadingCard visitSkeletonCard" aria-hidden="true">
            <div className="visitSkeletonHeader">
                <div className="skeleton visitSkeletonDate" />
                <div className="skeleton visitSkeletonStatus" />
            </div>

            <div className="skeleton visitSkeletonLine" />
            <div className="skeleton visitSkeletonLine visitSkeletonLine--short" />

            <div className="visitSkeletonActions">
                <div className="skeleton visitSkeletonButton" />
                <div className="skeleton visitSkeletonButton" />
                <div className="skeleton visitSkeletonButton" />
            </div>
        </Container>
    );
}

export default function MyVisitsSkeleton() {
    return (
        <>
            <VisitSkeletonCard />
            <VisitSkeletonCard />
            <VisitSkeletonCard />
        </>
    );
}
