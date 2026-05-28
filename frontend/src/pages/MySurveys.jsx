import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CellHeader, CellList, CellSimple, Container, Flex, Typography } from "@maxhub/max-ui";
import { ClipboardList, FileSearch } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { getStoredAccessToken, getSurveys } from "../api";
import EmptyStateCard from "../components/EmptyStateCard.jsx";

function toRuDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "без даты";
  }

  return parsed.toLocaleDateString("ru-RU");
}

function normalizeSurvey(item, index) {
  return {
    id: item?.surveyId || `survey-${index}`,
    status: item?.isDone ? "Завершена" : "Новая",
    title: item?.surveyTemplateTitle || "Анкета",
    dateLabel: toRuDate(item?.surveyDate),
  };
}

function SurveyStatus({ value }) {
  const isNew = value === "Новая";

  return (
    <span className={`statusPill ${isNew ? "" : "status--ok"}`}>
      {value}
    </span>
  );
}

export default function MySurveys() {
  const nav = useNavigate();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasSurveys = useMemo(() => surveys.length > 0, [surveys.length]);

  useEffect(() => {
    async function loadSurveys() {
      const accessToken = getStoredAccessToken();
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await getSurveys(accessToken);
        const items = Array.isArray(response?.items) ? response.items : [];
        setSurveys(items.map(normalizeSurvey));
      } catch {
        setError("Не удалось загрузить анкеты");
      } finally {
        setLoading(false);
      }
    }

    loadSurveys();
  }, []);

  return (
    <PageLayout
      showBottom
      bottomButtonText="Вернуться на главную"
      onBottomButtonClick={() => nav("/")}
    >
      <Flex direction="column" gap={10}>
        <CellHeader titleStyle="caps">Мои анкеты</CellHeader>

        {!loading && error ? (
          <Container className="card">
            <Typography.Label>{error}</Typography.Label>
          </Container>
        ) : null}

        {!loading && !error && !hasSurveys ? (
          <EmptyStateCard
            icon={FileSearch}
            title="Анкет пока нет"
            description="Новые анкеты появятся автоматически, когда клиника отправит их вам."
            primaryAction={{
              label: "На главную",
              onClick: () => nav("/"),
            }}
          />
        ) : null}

        {!loading && !error && hasSurveys ? (
          <Container className="card menuCard">
            <CellList>
              {surveys.map((survey) => (
                <CellSimple
                  key={survey.id}
                  before={<ClipboardList size={24} />}
                  showChevron
                  onClick={() => nav(`/surveys/${survey.id}`)}
                  after={<SurveyStatus value={survey.status} />}
                >
                  {survey.title} от {survey.dateLabel}
                </CellSimple>
              ))}
            </CellList>
          </Container>
        ) : null}
      </Flex>
    </PageLayout>
  );
}
