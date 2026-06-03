import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BriefcaseMedical,
  ChevronRight,
  MessageCircle,
  Mic,
  Phone,
  Search,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import PageLayout from "../components/PageLayout.jsx";
import AuthScreen from "../components/AuthScreen.jsx";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import { Button, Stack, Typography } from "../components/ui.jsx";
import {
  getAppointments,
  getCatalogSpecializationsBySchedule,
  getMedicalHistory,
  getStoredAccessToken,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { openExternalLink } from "../utils/safeUrl.js";

const REDIRECT_QUERY_KEYS = ["appointmentId", "specializationId", "doctorId", "branchId"];

function normalizeSpec(item) {
  return {
    id: item?.specializationId || "",
    title: item?.specializationTitle || "Без названия",
    type: item?.appointment_type || "online",
    phone: item?.appointement_phone || item?.appointment_phone || "",
  };
}

function isAnalysisTitle(title) {
  return /анализ/i.test(String(title || ""));
}

function compareTitle(a, b) {
  return String(a?.title || "").toUpperCase().localeCompare(String(b?.title || "").toUpperCase());
}

function openPhone(phoneRaw) {
  const digits = String(phoneRaw || "").replace(/[^\d+]/g, "");
  if (!digits) return;
  window.location.href = `tel:${digits}`;
}

function SpecialtyPlaceholder({ icon: Icon = Stethoscope }) {
  const Component = Icon;
  return (
    <span className="specialtyPlaceholder" aria-hidden="true">
      <Component size={30} />
    </span>
  );
}

function PopularCard({ spec, active, onClick }) {
  return (
    <button type="button" className={`card popularCard ${active ? "popularCard--active" : ""}`} onClick={onClick}>
      <SpecialtyPlaceholder />
      <Typography.Label>{spec.title}</Typography.Label>
    </button>
  );
}

function MethodCard({ icon: Icon, title, subtitle, tag, selected, onClick, children, showChevron = true }) {
  const Component = Icon;
  const content = (
    <>
      <span className="methodCard__icon" aria-hidden="true">
        <Component size={34} />
      </span>
      <span className="methodCard__body">
        <Typography.Title level={3}>{title}</Typography.Title>
        <Typography.Label>{subtitle}</Typography.Label>
        {tag ? <span className="methodTag">{tag}</span> : null}
        {children ? <span className="methodCard__actions">{children}</span> : null}
      </span>
      {showChevron && (
        <ChevronRight className="methodCard__chevron" size={24} aria-hidden="true" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`card methodCard ${selected ? "methodCard--selected" : ""}`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <section className={`card methodCard ${selected ? "methodCard--selected" : ""}`}>{content}</section>;
}

export default function BookVisit() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading: authLoading, isAuthorized } = useAuth();
  const accessToken = getStoredAccessToken();

  const [query, setQuery] = useState("");
  const [specs, setSpecs] = useState([]);
  const [counts, setCounts] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedContactSpecId = searchParams.get("contactSpecializationId") || "";
  const chatUrl = import.meta.env.VITE_MAX_CHAT_URL || "";

  const shouldRedirectToFlow = REDIRECT_QUERY_KEYS.some((key) => searchParams.has(key));

  useEffect(() => {
    if (!shouldRedirectToFlow) return;
    nav(`/book/flow?${searchParams.toString()}`, { replace: true });
  }, [nav, searchParams, shouldRedirectToFlow]);

  useEffect(() => {
    async function loadData() {
      if (!accessToken || shouldRedirectToFlow) return;

      try {
        setLoading(true);
        setError("");

        const [specsResponse, historyResponse, appointmentsResponse] = await Promise.allSettled([
          getCatalogSpecializationsBySchedule(accessToken),
          getMedicalHistory(accessToken),
          getAppointments(accessToken),
        ]);

        if (specsResponse.status !== "fulfilled") {
          throw new Error("specs_unavailable");
        }

        const nextSpecs = (Array.isArray(specsResponse.value?.items) ? specsResponse.value.items : [])
          .map(normalizeSpec)
          .filter((item) => item.id && !isAnalysisTitle(item.title))
          .sort(compareTitle);

        const frequency = new Map();
        const rows = [
          ...(historyResponse.status === "fulfilled" && Array.isArray(historyResponse.value?.items)
            ? historyResponse.value.items
            : []),
          ...(appointmentsResponse.status === "fulfilled" && Array.isArray(appointmentsResponse.value?.items)
            ? appointmentsResponse.value.items
            : []),
        ];

        for (const row of rows) {
          const id = row?.specializationId || "";
          const title = row?.specializationTitle || "";
          const key = id || title;
          if (!key || isAnalysisTitle(title)) continue;
          frequency.set(key, (frequency.get(key) || 0) + 1);
        }

        setSpecs(nextSpecs);
        setCounts(frequency);
      } catch {
        setError("Не удалось загрузить варианты записи");
        setSpecs([]);
        setCounts(new Map());
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [accessToken, shouldRedirectToFlow]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSpecs = useMemo(() => {
    if (!normalizedQuery) return specs;
    return specs.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, specs]);

  const popularSpecs = useMemo(() => {
    const hasCounts = Array.from(counts.values()).some((value) => value > 0);

    return [...filteredSpecs]
      .sort((a, b) => {
        if (hasCounts) {
          const aCount = counts.get(a.id) || counts.get(a.title) || 0;
          const bCount = counts.get(b.id) || counts.get(b.title) || 0;
          if (aCount !== bCount) return bCount - aCount;
        }

        return compareTitle(a, b);
      })
      .slice(0, 8);
  }, [counts, filteredSpecs]);

  const onlineSpecs = filteredSpecs.filter((item) => item.type === "online");
  const offlineSpecs = filteredSpecs.filter((item) => item.type === "phone" || item.type === "phone_and_chat");

  function openOnline(specId = "") {
    const params = new URLSearchParams();
    if (specId) params.set("specializationId", specId);
    nav(`/book/flow${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function openContactSpec(specId) {
    const params = new URLSearchParams({ contactSpecializationId: specId });
    nav(`/book?${params.toString()}`);
  }

  if (shouldRedirectToFlow) return null;

  if (authLoading) {
    return (
      <PageLayout headerTitle="Запись">
        <Stack gap={12}>
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--tx" />
          <div className="skeleton skeleton--tx" />
        </Stack>
      </PageLayout>
    );
  }

  if (!isAuthorized) {
    return <AuthScreen />;
  }

  return (
    <PageLayout headerTitle="Запись">
      <Stack gap={18}>
        <Typography.Title level={1}>Запись</Typography.Title>

        <div className="searchPanel">
          <Search size={24} aria-hidden="true" />
          <input
            className="uiControl"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найдите нужную специализацию"
          />
        </div>

        <Stack gap={12}>
          <Typography.Title level={2}>Популярное</Typography.Title>
          {loading ? (
            <div className="pageWideScroll">
              <div className="popularGrid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="card popularCard">
                    <div className="skeleton specialtyPlaceholder" />
                    <div className="skeleton skeleton--text" />
                  </div>
                ))}
              </div>
            </div>
          ) : popularSpecs.length ? (
            <div className="pageWideScroll">
              <div className="popularGrid">
                {popularSpecs.map((spec) => (
                  <PopularCard
                    key={spec.id}
                    spec={spec}
                    active={selectedContactSpecId === spec.id}
                    onClick={() => {
                      if (spec.type === "online") {
                        openOnline(spec.id);
                        return;
                      }
                      openContactSpec(spec.id);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Typography.Label>Подходящих специализаций не найдено</Typography.Label>
          )}
        </Stack>

        <Stack gap={12}>
          <Typography.Title level={2}>Способы записи</Typography.Title>

          {error ? (
            <EmptyStateCard
              icon={BriefcaseMedical}
              title={error}
              description="Попробуйте обновить страницу или обратитесь в клинику."
            />
          ) : null}

          {!error && loading ? (
            <>
              <div className="skeleton skeleton--tx" />
              <div className="skeleton skeleton--tx" />
              <div className="skeleton skeleton--tx" />
            </>
          ) : null}

          {!error && !loading && onlineSpecs.length ? (
            <MethodCard
              icon={BriefcaseMedical}
              title="Консультации"
              subtitle="Запись по врачу или услуге"
              onClick={() => openOnline()}
            />
          ) : null}

          {!error && !loading && offlineSpecs.map((spec) => (
            <MethodCard
              key={spec.id}
              icon={BriefcaseMedical}
              title={spec.title}
              subtitle={spec.type === "phone_and_chat" ? "Запись по телефону или в чате" : "Запись по телефону"}
              selected={selectedContactSpecId === spec.id}
              showChevron={false}
            >
              <Button mode="secondary" onClick={() => openPhone(spec.phone)} disabled={!spec.phone}>
                <Phone size={18} />
                Позвонить
              </Button>
              {spec.type === "phone_and_chat" ? (
                <Button mode="secondary" onClick={() => openExternalLink(chatUrl)} disabled={!chatUrl}>
                  <MessageCircle size={18} />
                  Чат
                </Button>
              ) : null}
            </MethodCard>
          ))}

          {!error && !loading && chatUrl ? (
            <MethodCard
              icon={Sparkles}
              title="Помощь с записью"
              subtitle="Напишите в чат клиники"
              selected={false}
              onClick={() => openExternalLink(chatUrl)}
            />
          ) : null}

          {!error && !loading && !onlineSpecs.length && !offlineSpecs.length ? (
            <EmptyStateCard
              icon={BriefcaseMedical}
              title="Вариантов записи пока нет"
              description="Клиника обновляет расписание. Попробуйте позже."
            />
          ) : null}
        </Stack>
      </Stack>
    </PageLayout>
  );
}
