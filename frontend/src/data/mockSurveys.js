export const SURVEY_STATUSES = {
  NEW: "Новая",
  DONE: "Завершена",
};

export const MOCK_SURVEYS = [
  {
    id: "e3a9e5f1-7a5d-4f2d-8979-b4c749ef2011",
    doctor: "Иванова И. И.",
    visitDate: "01.03.2026",
    status: SURVEY_STATUSES.NEW,
    questions: [
      "Оцените работу регистратуры",
      "Оцените внимательность врача",
      "Порекомендуете ли вы клинику знакомым?",
    ],
  },
  {
    id: "c5cf0e57-c9b6-4a57-92ae-c538d2676a76",
    doctor: "Петрова А. А.",
    visitDate: "20.02.2026",
    status: SURVEY_STATUSES.DONE,
    questions: [
      "Удалось ли записаться на удобное время?",
      "Оцените чистоту в клинике",
      "Было ли ожидание перед приемом?",
    ],
  },
];

export function getSurveyTitle(survey) {
  return `Анкетирование по посещению врача ${survey.doctor} от ${survey.visitDate}`;
}
