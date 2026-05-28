import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CellHeader, CellList, CellSimple, Container, Flex, Input, SearchInput, Switch, Textarea, Typography } from "@maxhub/max-ui";
import PageLayout from "../components/PageLayout";
import { getCatalogSurveyTemplateById, getStoredAccessToken, getSurveyById } from "../api";
import Pill from "../components/book-visit/Pill";

function toRuDateTime(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) {
    return "Без даты";
  }

  return parsed.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOptionTitle(option) {
  return String(option?.answerTitle ?? option?.answerTItle ?? option?.answertitle ?? "").trim();
}

function getOptionId(option, index) {
  return String(option?.answerId || index + 1);
}

function normalizeAnswerType(rawType) {
  const type = String(rawType || "").trim();
  if (type === "valueInInfoBase") return "valueInInfobase";
  if (type === "severalValuesFrom") return "severalValueFrom";
  return type || "string";
}

function normalizeSurvey(item, template) {
  const templateQuestions = Array.isArray(template?.questionItems) ? template.questionItems : [];
  const surveyItems = Array.isArray(item?.surveyItems) ? item.surveyItems : [];

  const answersByQuestionId = new Map();
  for (const answer of surveyItems) {
    const key = answer?.questionId;
    if (!key) continue;

    if (!answersByQuestionId.has(key)) {
      answersByQuestionId.set(key, []);
    }

    answersByQuestionId.get(key).push(answer);
  }

  const sectionById = new Map();
  const questions = [];
  let fallbackNumber = 1;

  for (const templateQuestion of templateQuestions) {
    if (templateQuestion?.isSection) {
      sectionById.set(templateQuestion?.questionId, templateQuestion?.questionWording || templateQuestion?.questionTitle || "Раздел");
      continue;
    }

    const answerList = answersByQuestionId.get(templateQuestion?.questionId) || [];
    const firstAnswer = answerList[0] || {};
    const answerItems = Array.isArray(templateQuestion?.questionOptions?.answerItems)
      ? templateQuestion.questionOptions.answerItems
      : [];
    const answerType = normalizeAnswerType(templateQuestion?.questionOptions?.answerType);

    const optionNumberByTitle = new Map(
      answerItems.map((option, index) => [getOptionTitle(option), index + 1]).filter(([title]) => Boolean(title)),
    );
    const optionIdByTitle = new Map(
      answerItems.map((option, index) => [getOptionTitle(option), getOptionId(option, index)]).filter(([title]) => Boolean(title)),
    );
    const optionIdByNumber = new Map(answerItems.map((option, index) => [index + 1, getOptionId(option, index)]));
    const validOptionIds = new Set(answerItems.map((option, index) => getOptionId(option, index)));

    function resolveOptionId(entry) {
      const directAnswerId = String(entry?.answerId || "").trim();
      if (directAnswerId && validOptionIds.has(directAnswerId)) {
        return directAnswerId;
      }

      const numberAnswer = Number(entry?.numberAnswer);
      if (Number.isFinite(numberAnswer) && numberAnswer > 0) {
        const byNumber = optionIdByNumber.get(numberAnswer);
        if (byNumber) return byNumber;
      }

      const byTitle = optionIdByTitle.get(String(entry?.answerTitle ?? "").trim());
      return byTitle || null;
    }

    const selectedNumbers = answerList
      .map((entry) => {
        if (answerType === "oneValueFrom" || answerType === "severalValueFrom" || answerType === "valueInInfobase") {
          return resolveOptionId(entry);
        }

        const direct = Number(entry?.numberAnswer);
        if (Number.isFinite(direct) && direct > 0) return direct;
        const byTitle = optionNumberByTitle.get(String(entry?.answerTitle ?? "").trim());
        return Number.isFinite(byTitle) ? byTitle : null;
      })
      .filter((value) => (answerType === "oneValueFrom" || answerType === "severalValueFrom" || answerType === "valueInInfobase"
        ? Boolean(String(value || "").trim())
        : Number.isFinite(value) && value > 0));

    const openAnswersByNumber = {};
    for (const answer of answerList) {
      const openAnswerValue = String(answer?.openAnswer || "");
      if (!openAnswerValue) continue;

      const optionId = resolveOptionId(answer);
      if (optionId) {
        openAnswersByNumber[optionId] = openAnswerValue;
        continue;
      }

      const answerNumber = Number(answer?.numberAnswer);
      if (Number.isFinite(answerNumber)) {
        openAnswersByNumber[String(answerNumber)] = openAnswerValue;
      }
    }

    const initialFromAnswer = firstAnswer?.openAnswer ?? firstAnswer?.answerTitle ?? "";
    const firstOptionId = resolveOptionId(firstAnswer);
    const firstNumberAnswer = Number(firstAnswer?.numberAnswer);
    const mappedNumberByTitle = optionNumberByTitle.get(String(firstAnswer?.answerTitle ?? "").trim());
    const initialNumberValue = Number.isFinite(firstNumberAnswer) && firstNumberAnswer > 0
      ? firstNumberAnswer
      : (Number.isFinite(mappedNumberByTitle) ? mappedNumberByTitle : "");
    const initialSelectedOptionId = selectedNumbers[0] ?? firstOptionId ?? "";
    const initialBooleanValue = typeof firstAnswer?.answerTitle === "boolean"
      ? firstAnswer.answerTitle
      : String(initialFromAnswer).toLowerCase() === "true";
    const numericAnswerFromText = Number(firstAnswer?.answerTitle);

    questions.push({
      id: templateQuestion?.questionId || `question-${fallbackNumber}`,
      number: firstAnswer?.numberQuestion || fallbackNumber,
      title: templateQuestion?.questionWording || templateQuestion?.questionTitle || firstAnswer?.questionTitle || "Вопрос",
      sectionTitle: sectionById.get(templateQuestion?.questionParent) || "",
      isRequired: Boolean(templateQuestion?.isRequired),
      help: templateQuestion?.questionHelpDescription || "",
      answerType,
      selectorType: templateQuestion?.questionOptions?.selector_type || "selector",
      flagType: templateQuestion?.questionOptions?.flag_type || "input",
      requiresComment: Boolean(templateQuestion?.questionOptions?.requiresComment),
      commentDescription: templateQuestion?.questionOptions?.commentDescription || "Введите комментарий",
      constraints: templateQuestion?.questionOptions?.constraints || {},
      answerItems,
      initialText: String(initialFromAnswer || ""),
      initialNumber: Number.isFinite(numericAnswerFromText) && String(firstAnswer?.answerTitle).trim() !== ""
        ? String(numericAnswerFromText)
        : (answerType === "oneValueFrom" || answerType === "severalValueFrom" || answerType === "valueInInfobase"
          ? String(initialSelectedOptionId)
          : (initialNumberValue === "" ? "" : String(initialNumberValue))),
      initialBoolean: Boolean(initialBooleanValue),
      initialComment: "",
      initialSelectedNumbers: selectedNumbers,
      initialOpenAnswersByNumber: openAnswersByNumber,
    });

    fallbackNumber += 1;
  }

  return {
    id: item?.surveyId || "",
    isDone: Boolean(item?.isDone),
    status: item?.isDone ? "Завершена" : "Новая",
    title: item?.surveyTemplateTitle || template?.surveyTemplateTitle || "Анкета",
    date: toRuDateTime(item?.surveyDate),
    questions: questions.sort((a, b) => a.number - b.number),
  };
}

function buildInitialState(questions) {
  const state = {};

  for (const question of questions) {
    state[question.id] = {
      text: question.initialText,
      number: question.initialNumber,
      bool: question.initialBoolean,
      comment: question.initialComment,
      selectedNumbers: question.initialSelectedNumbers,
      openAnswersByNumber: question.initialOpenAnswersByNumber,
    };
  }

  return state;
}

export default function SurveyDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answersState, setAnswersState] = useState({});
  const [openSelects, setOpenSelects] = useState({});
  const [selectSearch, setSelectSearch] = useState({});

  useEffect(() => {
    async function loadSurvey() {
      const accessToken = getStoredAccessToken();
      if (!id || !accessToken) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const surveyResponse = await getSurveyById(accessToken, id);
        const found = surveyResponse?.item || null;

        if (!found?.surveyTemplateId) {
          setSurvey(null);
          setAnswersState({});
          return;
        }

        const templateResponse = await getCatalogSurveyTemplateById(accessToken, found.surveyTemplateId);
        const template = templateResponse?.item || null;
        const normalized = normalizeSurvey(found, template);

        setSurvey(normalized);
        setAnswersState(normalized ? buildInitialState(normalized.questions) : {});
      } catch {
        setError("Не удалось загрузить анкету");
      } finally {
        setLoading(false);
      }
    }

    loadSurvey();
  }, [id]);

  const hasQuestions = useMemo(() => (survey?.questions?.length || 0) > 0, [survey?.questions?.length]);

  function patchAnswer(questionId, patch) {
    setAnswersState((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        ...patch,
      },
    }));
  }

  function toggleSeveral(questionId, answerNumber, checked) {
    const current = answersState[questionId]?.selectedNumbers || [];
    const next = checked
      ? [...new Set([...current, answerNumber])]
      : current.filter((item) => item !== answerNumber);

    patchAnswer(questionId, { selectedNumbers: next });
  }

  function toggleSelect(questionId) {
    setOpenSelects((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  }

  function renderAnswerControl(question) {
    const state = answersState[question.id] || {};
    const constraints = question.constraints || {};
    const isDisabled = Boolean(survey?.isDone);

    if (question.answerType === "boolean") {
      if (question.flagType === "switch") {
        return (
          <Switch
            checked={Boolean(state.bool)}
            disabled={isDisabled}
            onChange={(event) => patchAnswer(question.id, { bool: event.target.checked })}
          />
        );
      }

      const isOpen = Boolean(openSelects[question.id]);
      const selectedTitle = state.bool ? "Да" : "Нет";

      return (
        <div className="surveySelectAccordion">
          <CellSimple
            title={selectedTitle}
            showChevron
            disabled={isDisabled}
            className="surveySelectTrigger"
            onClick={() => {
              if (!isDisabled) toggleSelect(question.id);
            }}
          />
          {isOpen ? (
            <CellList className="surveyOptionsList" mode="island" filled>
              <CellSimple
                title="Да"
                selected={Boolean(state.bool)}
                onClick={() => {
                  if (isDisabled) return;
                  patchAnswer(question.id, { bool: true });
                  setOpenSelects((prev) => ({ ...prev, [question.id]: false }));
                }}
                showChevron={false}
                after={<span className={`surveyOptionDot ${state.bool ? "surveyOptionDot--active" : ""}`} />}
              />
              <CellSimple
                title="Нет"
                selected={!state.bool}
                onClick={() => {
                  if (isDisabled) return;
                  patchAnswer(question.id, { bool: false });
                  setOpenSelects((prev) => ({ ...prev, [question.id]: false }));
                }}
                showChevron={false}
                after={<span className={`surveyOptionDot ${!state.bool ? "surveyOptionDot--active" : ""}`} />}
              />
            </CellList>
          ) : null}
        </div>
      );
    }

    if (question.answerType === "string") {
      const maxLength = constraints.length ?? constraints.lenght ?? undefined;
      return (
        <Input
          mode="secondary"
          value={state.text || ""}
          maxLength={maxLength}
          disabled={isDisabled}
          onChange={(event) => patchAnswer(question.id, { text: event.target.value })}
          placeholder="Введите ответ"
        />
      );
    }

    if (question.answerType === "text") {
      return (
        <Textarea
          mode="secondary"
          value={state.text || ""}
          disabled={isDisabled}
          onChange={(event) => patchAnswer(question.id, { text: event.target.value })}
          placeholder="Введите ответ"
        />
      );
    }

    if (question.answerType === "number") {
      const step = constraints.decimal ? 1 / (10 ** Number(constraints.decimal)) : 1;
      const min = constraints.minValue ?? undefined;
      const max = constraints.maxValue ?? undefined;
      const currentNumber = Number(state.number);
      const canMinus = Number.isFinite(currentNumber) ? (min === undefined || currentNumber > min) : false;
      const canPlus = Number.isFinite(currentNumber) ? (max === undefined || currentNumber < max) : true;

      function clamp(value) {
        if (!Number.isFinite(value)) return value;
        if (min !== undefined && value < min) return min;
        if (max !== undefined && value > max) return max;
        return value;
      }

      function applyDelta(delta) {
        const baseValue = Number.isFinite(currentNumber) ? currentNumber : (min ?? 0);
        const next = clamp(baseValue + delta);
        patchAnswer(question.id, { number: String(next) });
      }

      return (
        <div className="surveyNumberControl">
          <button
            type="button"
            className="surveyNumberButton"
            onClick={() => applyDelta(-step)}
            disabled={isDisabled || !canMinus}
          >
            −
          </button>
          <input
            type="number"
            className="surveyControl surveyNumberInput"
            value={state.number || ""}
            min={min}
            max={max}
            step={step}
            disabled={isDisabled}
            onChange={(event) => patchAnswer(question.id, { number: event.target.value })}
          />
          <button
            type="button"
            className="surveyNumberButton"
            onClick={() => applyDelta(step)}
            disabled={isDisabled || !canPlus}
          >
            +
          </button>
        </div>
      );
    }

    if (question.answerType === "valueInInfobase") {
      const isOpen = Boolean(openSelects[question.id]);
      const searchValue = selectSearch[question.id] || "";
      const selectedEntry = question.answerItems.find((item, index) => String(item.answerId || index + 1) === String(state.number || ""));
      const selectedTitle = selectedEntry ? getOptionTitle(selectedEntry) : "";
      const filteredItems = question.answerItems
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
        if (!searchValue.trim()) return true;
        const title = getOptionTitle(item).toLowerCase();
        return title.includes(searchValue.trim().toLowerCase());
        });

      return (
        <div className="surveySelectAccordion">
          <CellSimple
            title={selectedTitle || "Выберите значение"}
            showChevron
            disabled={isDisabled}
            className="surveySelectTrigger"
            onClick={() => {
              if (!isDisabled) toggleSelect(question.id);
            }}
          />

          {isOpen ? (
            <div className="surveySelectDropdown">
              {question.answerItems.length > 10 ? (
                <SearchInput
                  value={searchValue}
                  onChange={(event) => {
                    setSelectSearch((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }));
                  }}
                  placeholder="Поиск варианта"
                />
              ) : null}

              <CellList className="surveyOptionsList" mode="island" filled>
                {filteredItems.map(({ item, index }) => {
                  const optionValue = String(item.answerId || index + 1);
                  const selected = String(state.number || "") === optionValue;
                  return (
                    <CellSimple
                      key={optionValue}
                      title={getOptionTitle(item) || String(item.answerId || `Вариант ${index + 1}`)}
                      selected={selected}
                      onClick={() => {
                        if (isDisabled) return;
                        patchAnswer(question.id, { number: optionValue });
                        setOpenSelects((prev) => ({ ...prev, [question.id]: false }));
                      }}
                      showChevron={false}
                      after={<span className={`surveyOptionDot ${selected ? "surveyOptionDot--active" : ""}`} />}
                    />
                  );
                })}
              </CellList>
            </div>
          ) : null}
        </div>
      );
    }

    if (question.answerType === "oneValueFrom") {
      const selectedAnswerId = String(state.number || "");

      return (
        <Flex direction="column" gap={8}>
          {question.selectorType === "toggle" ? (
            <Flex wrap="wrap" gap={8}>
              {question.answerItems.map((answerOption, index) => {
                const answerId = getOptionId(answerOption, index);
                return (
                  <Pill
                    key={answerId}
                    active={selectedAnswerId === answerId}
                    disabled={isDisabled}
                    onClick={() => patchAnswer(question.id, { number: answerId })}
                  >
                    {getOptionTitle(answerOption) || `Вариант ${index + 1}`}
                  </Pill>
                );
              })}
            </Flex>
          ) : (
            <CellList className="surveyOptionsList" mode="island" filled>
              {question.answerItems.map((answerOption, index) => {
                const answerId = getOptionId(answerOption, index);
                const isSelected = selectedAnswerId === answerId;
                return (
                  <CellSimple
                    key={answerId}
                    title={getOptionTitle(answerOption) || `Вариант ${index + 1}`}
                    selected={isSelected}
                    onClick={() => {
                      if (!isDisabled) patchAnswer(question.id, { number: answerId });
                    }}
                    showChevron={false}
                    after={<span className={`surveyOptionDot ${isSelected ? "surveyOptionDot--active" : ""}`} />}
                  />
                );
              })}
            </CellList>
          )}

          {question.requiresComment ? (
            <Textarea
              mode="secondary"
              value={state.comment || ""}
              disabled={isDisabled}
              placeholder={question.commentDescription}
              onChange={(event) => patchAnswer(question.id, { comment: event.target.value })}
            />
          ) : null}
        </Flex>
      );
    }

    if (question.answerType === "severalValueFrom") {
      const selectedNumbers = state.selectedNumbers || [];
      const openAnswersByNumber = state.openAnswersByNumber || {};

      return (
        <CellList className="surveyOptionsList" mode="island" filled>
          {question.answerItems.map((answerOption, index) => {
            const answerId = getOptionId(answerOption, index);
            const checked = selectedNumbers.includes(answerId);

            return (
              <div key={answerId}>
                <CellSimple
                  title={getOptionTitle(answerOption) || `Вариант ${index + 1}`}
                  selected={checked}
                  onClick={() => {
                    if (!isDisabled) toggleSeveral(question.id, answerId, !checked);
                  }}
                  showChevron={false}
                  after={<span className={`surveyOptionCheck ${checked ? "surveyOptionCheck--active" : ""}`} />}
                />

                {answerOption.requiresOpenAnswer ? (
                  <Input
                    mode="secondary"
                    value={openAnswersByNumber[answerId] || ""}
                    disabled={isDisabled}
                    placeholder="Введите свой вариант"
                    onChange={(event) => {
                      patchAnswer(question.id, {
                        openAnswersByNumber: {
                          ...openAnswersByNumber,
                          [answerId]: event.target.value,
                        },
                      });
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </CellList>
      );
    }

    return (
      <Input
        mode="secondary"
        value={state.text || ""}
        disabled={isDisabled}
        onChange={(event) => patchAnswer(question.id, { text: event.target.value })}
        placeholder="Введите ответ"
      />
    );
  }

  if (!loading && !error && !survey) {
    return (
      <PageLayout showBottom bottomButtonText="К списку анкет" onBottomButtonClick={() => nav("/surveys")}>
        <Container className="card">
          <Typography.Title level={3}>Анкета не найдена</Typography.Title>
          <Typography.Label style={{ marginTop: 6 }}>Проверьте ссылку или вернитесь к списку анкет.</Typography.Label>
        </Container>
      </PageLayout>
    );
  }

  let previousSection = "";

  return (
    <PageLayout showBottom bottomButtonText="К списку анкет" onBottomButtonClick={() => nav("/surveys")}>
      <Flex direction="column" gap={10}>
        <CellHeader titleStyle="caps">Анкета</CellHeader>

        <Container className="card">
          <Flex direction="column" gap={8}>
            <Typography.Title level={3}>{survey?.title || "Анкета"}</Typography.Title>
            <Typography.Label>Дата: {survey?.date || "Без даты"}</Typography.Label>
            <span className={`statusPill ${survey?.status === "Новая" ? "" : "status--ok"}`}>{survey?.status || "—"}</span>
          </Flex>
        </Container>

        <Container className="card">
          {loading ? <Typography.Label>Загрузка анкеты...</Typography.Label> : null}
          {!loading && error ? <Typography.Label>{error}</Typography.Label> : null}

          {!loading && !error && hasQuestions ? (
            <Flex direction="column" gap={14}>
              {survey.questions.map((question) => {
                const shouldShowSection = question.sectionTitle && question.sectionTitle !== previousSection;
                if (shouldShowSection) {
                  previousSection = question.sectionTitle;
                }

                return (
                  <div key={question.id} style={{ width: "100%" }}>
                    {shouldShowSection ? <Typography.Title level={3}>{question.sectionTitle}</Typography.Title> : null}

                    <Typography.Label style={{ display: "block", marginBottom: 8 }}>
                      {question.number}. {question.title}{question.isRequired ? " *" : ""}
                    </Typography.Label>

                    {renderAnswerControl(question)}

                    {question.help ? (
                      <Typography.Label style={{ display: "block", marginTop: 4, color: "var(--tg-theme-hint-color, #7d7d7d)" }}>
                        {question.help}
                      </Typography.Label>
                    ) : null}
                  </div>
                );
              })}
            </Flex>
          ) : null}

          {!loading && !error && !hasQuestions ? (
            <Typography.Label>В анкете пока нет вопросов.</Typography.Label>
          ) : null}
        </Container>
      </Flex>
    </PageLayout>
  );
}
