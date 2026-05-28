import { useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { CellHeader, Flex } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import EmptyStateCard from "../components/EmptyStateCard.jsx";

export default function NotFound() {
  const nav = useNavigate();

  return (
    <PageLayout showBottom={false}>
      <Flex direction="column" gap={10}>
        <CellHeader titleStyle="caps">Страница не найдена</CellHeader>

        <EmptyStateCard
          icon={Compass}
          title="Упс, такой страницы нет"
          description="Похоже, ссылка устарела или введена с ошибкой. Вернитесь на главную и продолжите работу в приложении."
          primaryAction={{
            label: "На главную",
            onClick: () => nav("/"),
          }}
          secondaryAction={{
            label: "Назад",
            onClick: () => nav(-1),
          }}
        />
      </Flex>
    </PageLayout>
  );
}
