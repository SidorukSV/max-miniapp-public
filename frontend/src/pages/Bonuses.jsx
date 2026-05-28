import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, CellHeader } from "@maxhub/max-ui";
import { format, isValid, parse, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import PageLayout from "../components/PageLayout";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import { useAuth } from "../context/AuthContext";
import { getBonusTransactions, getStoredAccessToken } from "../api";
import "../App.css";
import BonusesSkeleton from "../components/bonuses/BonusesSkeleton.jsx";
import { WalletCards } from "lucide-react";

function formatTransactionDate(dateISO) {
  if (!dateISO) {
    return "Без даты";
  }


  try {
    const stringDate = String(dateISO).trim();
    const parsedDate = isValid(parseISO(stringDate))
      ? parseISO(stringDate)
      : parse(stringDate, "yyyy-MM-dd'T'HH:mm:ss", new Date());

    if (!isValid(parsedDate)) {
      return "Без даты";
    }

    return format(parsedDate, "d MMMM yyyy", { locale: ru });
  } catch {
    return "Без даты";
  }
}

export default function Bonuses() {
  const nav = useNavigate();
  const { me } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError("");

        const accessToken = getStoredAccessToken();

        if (!accessToken) {
          setItems([]);
          return;
        }

        const response = await getBonusTransactions(accessToken);
        setItems(Array.isArray(response?.items) ? response.items : []);
      } catch {
        setError("Не удалось загрузить историю бонусов");
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const balance = useMemo(() => Number(me?.bonus || 0), [me?.bonus]);
  const groupedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0));
    const map = new Map();

    for (const item of sorted) {
      const key = formatTransactionDate(item?.date);
      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key).push(item);
    }

    return Array.from(map.entries());
  }, [items]);

  return (
    <PageLayout
      showBottom={true}
      bottomButtonText="Вернуться на главную"
      onBottomButtonClick={() => { nav("/") }}
    >
      <Flex direction="column" gap={10}>
        {loading ? (
          <BonusesSkeleton />
        ) : (
          <>
            <Container className="card">
              <Flex direction="column" gap={10}>
                <Typography.Title level={2}>{balance} ₽</Typography.Title>
                <Typography.Label>Текущий остаток бонусов</Typography.Label>
              </Flex>
            </Container>

            <Container className="card">
              <Flex direction="column" gap={10}>
                <Typography.Title level={3}>История операций</Typography.Title>

                {error ? <Typography.Label>{error}</Typography.Label> : null}

                {!error && items.length === 0 ? (
                  <EmptyStateCard
                    icon={WalletCards}
                    title="История операций пуста"
                    description="Когда начисления или списания появятся, вы увидите их здесь с деталями."
                  />
                ) : null}

                {!error && items.length > 0
                  ? groupedItems.map(([dateLabel, dateItems]) => (
                    <div key={dateLabel} className="bonusesDateGroup">
                      <CellHeader titleStyle="caps" className="bonusesDateHeader">{dateLabel}</CellHeader>

                      {dateItems.map((item, index) => {
                        const isCredit = item.operation === "credit";

                        return (
                          <div key={`${item.operation}-${item.sum}-${index}`} className="bonusesTxRow">
                            <div className="bonusesTxLeft">
                              <Typography.Label>{item.description || "Без описания"}</Typography.Label>

                              {item.operation_sum !== 0 ? (
                                <Typography.Label className="roleLine">Сумма покупки: {item.operation_sum} ₽</Typography.Label>
                              ) : null}
                            </div>

                            <div className={`bonusesTxAmount ${isCredit ? "bonusesTxAmount--credit" : "bonusesTxAmount--debit"}`}>
                              {isCredit ? "+" : "-"}
                              {item.sum} ₽
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                  : null}
              </Flex>
            </Container>
          </>
        )}
      </Flex>
    </PageLayout>
  );
}
