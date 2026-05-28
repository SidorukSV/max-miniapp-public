import { Container, Flex } from "@maxhub/max-ui";

function HistorySkeletonCard() {
    return (
        <Container className="card card--tight loadingCard historySkeletonCard" aria-hidden="true">
            <div className="skeleton historySkeletonTitle" />
            <div className="skeleton historySkeletonLine" />
            <div className="skeleton historySkeletonLine historySkeletonLine--short" />
            <div className="skeleton historySkeletonService" />
            <div className="skeleton historySkeletonButton" />
        </Container>
    );
}

export default function HistorySkeleton() {
    return (
        <Flex className="historySkeletonList" aria-label="Загрузка истории приемов" direction="column" gap={10} style={ { width: "100%" } }>
            <div className="skeleton historySkeletonMonth" />
            
            <HistorySkeletonCard />
            <HistorySkeletonCard />
        </Flex>
    );
}
