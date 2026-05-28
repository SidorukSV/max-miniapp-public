import { Container } from "@maxhub/max-ui";

export default function BonusesSkeleton() {
    return (
        <div className="bonusesSkeleton" aria-label="Загрузка страницы бонусов" style={{ width: "100%" }}>
            <Container className="card loadingCard bonusesSkeletonBalanceCard">
                <div className="skeleton bonusesSkeletonBalance" />
                <div className="skeleton bonusesSkeletonLabel" />
            </Container>

            <Container className="card loadingCard bonusesSkeletonHistoryCard">
                <div className="skeleton skeleton--title skeleton--w40" />
                <div className="skeleton bonusesSkeletonDate" />
                <div className="skeleton skeleton--tx" />
                <div className="skeleton skeleton--tx" />
                <div className="skeleton skeleton--tx skeleton--w85" />
            </Container>
        </div>
    );
}
