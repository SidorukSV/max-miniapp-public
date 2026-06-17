import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Flex, Typography, Button } from "../components/ui.jsx";
import { BranchInfoRow, DoctorInfoRow, ServicesInfoRow } from "../components/VisitInfoRows.jsx";
import PageLayout from "../components/PageLayout";
import {
    getMedicalHistory,
    getStoredAccessToken,
} from "../api.js";
import "../App.css";
import HistorySkeleton from "../components/history/HistorySkeleton.jsx";
import EmptyStateCard from "../components/EmptyStateCard.jsx";
import { FileClock } from "lucide-react";

function parseMedicalDate(value) {
    if (!value) return null;

    const normalized = String(value).trim();

    if (/^\d{2}\.\d{2}\.\d{4}/.test(normalized)) {
        const [datePart, timePart = ""] = normalized.split(" ");
        const [dd, mm, yyyy] = datePart.split(".");
        const [hh = "00", min = "00", sec = "00"] = timePart.split(":");
        return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(sec));
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function toLocalDateLabel(dateValue) {
    const parsed = parseMedicalDate(dateValue);
    if (!parsed) return "—";

    return parsed.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function toLocalTimeLabel(dateValue) {
    const parsed = parseMedicalDate(dateValue);
    if (!parsed) return "";

    return parsed.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function monthKey(dateValue) {
    const parsed = parseMedicalDate(dateValue);
    if (!parsed) return "Без даты";

    const monthNames = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
    ];

    return `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

function getDoctorName(item) {
    const parts = [item?.doctorLastname, item?.doctorFirstname, item?.doctorPatronymic]
        .map((part) => String(part || "").trim())
        .filter(Boolean);

    if (parts.length) {
        return parts.join(" ");
    }

    return "Врач не указан";
}

function HistoryCard({ item, onRepeat }) {
    const dateLabel = toLocalDateLabel(item.date);
    const timeLabel = toLocalTimeLabel(item.date);
    const doctorName = getDoctorName(item);
    const services = Array.isArray(item?.servicesList)
        ? item.servicesList.map((service) => service?.serviceTitle).filter(Boolean)
        : [];

    return (
        <Container className="card">
            <Flex direction="column" gap={10}>
                <Typography.Title level={3}>
                    {dateLabel}{timeLabel ? ` • ${timeLabel}` : ""}
                </Typography.Title>

                <DoctorInfoRow doctor={doctorName} specialization={item?.specializationTitle || "Специальность не указана"} />
                <BranchInfoRow clinic={item?.branchTitle || "Филиал не указан"} />
                <ServicesInfoRow services={services} />

                <Button mode="secondary" onClick={() => onRepeat(item)}>
                    Повторить запись
                </Button>
            </Flex>
        </Container>
    );
}

export default function History() {
    const nav = useNavigate();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadHistory() {
            const accessToken = getStoredAccessToken();
            if (!accessToken) {
                setError("Не найден токен авторизации");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");
                const response = await getMedicalHistory(accessToken);
                const rows = Array.isArray(response?.items) ? response.items : [];
                const sortedRows = [...rows].sort((a, b) => {
                    const aDate = parseMedicalDate(a?.date)?.getTime() || 0;
                    const bDate = parseMedicalDate(b?.date)?.getTime() || 0;
                    return bDate - aDate;
                });
                setItems(sortedRows);
            } catch {
                setError("Не удалось загрузить историю приёмов");
                setItems([]);
            } finally {
                setLoading(false);
            }
        }

        loadHistory();
    }, []);

    const grouped = useMemo(() => {
        const map = new Map();

        for (const item of items) {
            const key = monthKey(item?.date);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
        }

        return Array.from(map.entries());
    }, [items]);

    async function repeat(item) {
        if (!item?.specializationId || !item?.doctorId) {
            return;
        }

        if (item?.specializationType !== "online") {
            const params = new URLSearchParams({
                contactSpecializationId: item.specializationId,
            });
            nav(`/book?${params.toString()}`);
            return;
        }

        const params = new URLSearchParams();
        params.set("specializationId", item.specializationId);
        params.set("doctorId", item.doctorId);
        if (item?.branchId) {
            params.set("branchId", item.branchId);
        }

        nav(`/book/flow?${params.toString()}`);
    }

    return (
        <PageLayout
            showBottom
            headerTitle="Медкарта"
        >
            <Flex direction="column" gap={12}>
                <Typography.Title level={2}>Медкарта</Typography.Title>

                {loading ? <HistorySkeleton /> : null}
                {!loading && error ? <Typography.Label className="authErrorLabel">{error}</Typography.Label> : null}
                {!loading && !error && !items.length ? (
                    <EmptyStateCard
                        icon={FileClock}
                        title="История приёмов пуста"
                        description="Когда вы посетите клинику, все приёмы с датой и услугами появятся в этом разделе."
                        primaryAction={{
                            label: "Записаться на приём",
                            onClick: () => nav("/book"),
                        }}
                    />
                ) : null}

                {grouped.map(([month, monthItems]) => (
                    <div key={month} className="historyGroup">
                        <div className="historyGroupHeader">
                            <span className="historyGroupBar" />
                            <Typography.Label className="historyMonth">
                                {month}
                            </Typography.Label>
                        </div>

                        <Flex direction="column" gap={10}>
                            {monthItems.map((it, index) => (
                                <HistoryCard
                                    key={`${it?.doctorId || "doctor"}-${it?.date || "date"}-${index}`}
                                    item={it}
                                    onRepeat={repeat}
                                />
                            ))}
                        </Flex>
                    </div>
                ))}
            </Flex>

        </PageLayout>
    );
}
