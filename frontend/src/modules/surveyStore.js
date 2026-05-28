import { MOCK_SURVEYS, SURVEY_STATUSES } from "../data/mockSurveys";

const STORAGE_KEY = "miniapp_surveys_v1";

function clone(items) {
  return JSON.parse(JSON.stringify(items));
}

function loadSurveys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(MOCK_SURVEYS);
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return clone(MOCK_SURVEYS);
    }

    return parsed;
  } catch {
    return clone(MOCK_SURVEYS);
  }
}

function saveSurveys(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getSurveys() {
  return loadSurveys();
}

export function getSurveyById(id) {
  return loadSurveys().find((survey) => survey.id === id) || null;
}

export function completeSurvey(id, answers) {
  const surveys = loadSurveys();
  const next = surveys.map((survey) =>
    survey.id === id
      ? {
          ...survey,
          status: SURVEY_STATUSES.DONE,
          answers,
          completedAt: new Date().toISOString(),
        }
      : survey
  );

  saveSurveys(next);

  return next.find((survey) => survey.id === id) || null;
}
