import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMax } from "../context/MaxContext";

function extractSurveyId(payload) {
  if (!payload || typeof payload !== "string") {
    return null;
  }

  const normalized = payload.trim();

  try {
    const params = new URLSearchParams(normalized);
    const idFromParams = params.get("survey_id");
    if (idFromParams) {
      return idFromParams;
    }
  } catch {
    // noop
  }

  const match = normalized.match(/survey_id=([0-9a-fA-F-]{36})/);
  return match?.[1] || null;
}

function getPayloadSources(max, locationSearch, locationHash) {
  const fromSearch = new URLSearchParams(locationSearch).get("payload");

  let fromHash = null;
  if (locationHash?.includes("?")) {
    const hashQuery = locationHash.slice(locationHash.indexOf("?") + 1);
    fromHash = new URLSearchParams(hashQuery).get("payload");
  }

  return [
    fromSearch,
    fromHash,
    max?.initDataUnsafe?.payload,
    max?.initDataUnsafe?.start_param,
  ].filter(Boolean);
}

export default function PayloadSurveyRedirect() {
  const max = useMax();
  const nav = useNavigate();
  const location = useLocation();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    const payloads = getPayloadSources(max, location.search, location.hash);

    for (const payload of payloads) {
      const surveyId = extractSurveyId(payload);
      if (surveyId) {
        handledRef.current = true;
        nav(`/surveys/${surveyId}`, { replace: true });
        return;
      }
    }

    handledRef.current = true;
  }, [location.hash, location.search, max, nav]);

  return null;
}
