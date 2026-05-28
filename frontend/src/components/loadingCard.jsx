import { Container, Flex } from "@maxhub/max-ui";

export function HomeLoadingCard() {
  return (
    <Flex direction="column" gap={10}>
      <Container className="card card--tight loadingCard">
        <Flex align="center" justify="space-between" gap={12}>
          <Flex align="center" gap={12} style={{ minWidth: 0, width: "100%" }}>
            <div className="skeleton skeleton--avatar" />
            <div className="loadingCardMeta">
              <div className="skeleton skeleton--title" />
              <div className="skeleton skeleton--text" />
            </div>
          </Flex>
          <div className="skeleton skeleton--chip" />
        </Flex>
      </Container>

      <Container className="card menuCard loadingMenuCard">
        <div className="skeletonRow" />
        <div className="skeletonRow" />
        <div className="skeletonRow" />
        <div className="skeletonRow" />
      </Container>
    </Flex>
  );
}

export function BonusesLoadingCard() {
  return (
    <div className="bonusesLoading" aria-label="Загрузка истории операций" style={ { width: "100%" } }>
      <div className="skeleton skeleton--title skeleton--w40" />
      <div className="skeleton skeleton--tx" />
      <div className="skeleton skeleton--tx" />
      <div className="skeleton skeleton--tx skeleton--w85" />
    </div>
  );
}
