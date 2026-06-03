import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Gift, LogOut, RefreshCw, UserRound } from "lucide-react";
import PageLayout from "../components/PageLayout.jsx";
import AuthScreen from "../components/AuthScreen.jsx";
import { Avatar, Button, Card, CellList, CellSimple, Stack, Typography } from "../components/ui.jsx";
import {
  authLogout,
  authSwitchPatient,
  clearTokens,
  getMe,
  getStoredAccessToken,
  getVersion,
  storeTokens,
} from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { FRONTEND_BUILD } from "../buildInfo.js";
import { dateISOFormat } from "../modules/DateFormat.js";
import { getFallbackGradientByInitials } from "../modules/avatarGradient.js";

function formatPhoneToInternational(phone) {
  if (!phone) return "";

  const cleaned = String(phone).replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  const formatRu = (normalizedRuDigits) => `+7 ${normalizedRuDigits.slice(1, 4)} ${normalizedRuDigits.slice(4, 7)} ${normalizedRuDigits.slice(7, 9)} ${normalizedRuDigits.slice(9, 11)}`;

  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    const normalized = `7${digits.slice(1)}`;
    return formatRu(normalized);
  }

  if (digits.length === 10) return formatRu(`7${digits}`);
  if (cleaned.startsWith("+")) return `+${digits}`;
  if (digits.length > 0) return `+${digits}`;
  return phone;
}

function VersionRow({ label, value }) {
  return (
    <div className="versionRow">
      <Typography.Label>{label}</Typography.Label>
      <span className="versionValue">{value || "unknown"}</span>
    </div>
  );
}

export default function Profile() {
  const nav = useNavigate();
  const { me, loading, isAuthorized, setMe } = useAuth();
  const [busy, setBusy] = useState(false);
  const [patientSwitchBusy, setPatientSwitchBusy] = useState("");
  const [error, setError] = useState("");
  const [backendVersion, setBackendVersion] = useState(null);

  const username = me?.fullName || "Пациент";
  const phone = formatPhoneToInternational(me?.phone || "");
  const initials = username
    .trim()
    .split(/\s+/, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const patientsByPhone = Array.isArray(me?.patients_by_phone) ? me.patients_by_phone : [];
  const balance = useMemo(() => Number(me?.bonus || 0), [me?.bonus]);

  useEffect(() => {
    async function loadVersion() {
      try {
        const response = await getVersion();
        setBackendVersion(response);
      } catch {
        setBackendVersion(null);
      }
    }

    loadVersion();
  }, []);

  async function handleSwitchPatient(patientId) {
    const accessToken = getStoredAccessToken();
    if (!accessToken || !patientId || patientId === me?.patient_id) return;

    setPatientSwitchBusy(patientId);
    setError("");
    try {
      const switched = await authSwitchPatient({
        access_token: accessToken,
        patient_id: patientId,
      });
      storeTokens(switched);
      const meData = await getMe(switched.access_token);
      setMe(meData);
    } catch {
      setError("Не удалось переключить пациента");
    } finally {
      setPatientSwitchBusy("");
    }
  }

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await authLogout();
    } catch {
      // Local token cleanup is enough to leave the account screen.
    } finally {
      clearTokens();
      setMe(null);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageLayout headerTitle="Профиль">
        <div className="skeleton skeleton--tx" />
      </PageLayout>
    );
  }

  if (!isAuthorized) {
    return <AuthScreen />;
  }

  return (
    <PageLayout headerTitle="Профиль">
      <Stack gap={14}>
        <Typography.Title level={1}>Профиль</Typography.Title>

        <Card>
          <div className="profilePreview">
            <div className="profilePreview__main">
              <Avatar.Container size={64}>
                <Avatar.Image
                  fallback={initials}
                  fallbackGradient={getFallbackGradientByInitials(initials, me?.patient_id || phone)}
                />
              </Avatar.Container>
              <div className="nameBlock">
                <Typography.Title level={3} className="nameLine">{username}</Typography.Title>
                <Typography.Label>{phone || "Телефон не указан"}</Typography.Label>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CellList>
            <CellSimple
              before={<Gift size={22} />}
              title={`${balance} бонусов`}
              subtitle="Текущий баланс"
              showChevron
              onClick={() => nav("/bonuses")}
            />
          </CellList>
        </Card>

        {patientsByPhone.length > 1 ? (
          <Card>
            <Stack gap={10}>
              <Typography.Title level={3}>Пациенты</Typography.Title>
              <CellList>
                {patientsByPhone.map((patient) => (
                  <CellSimple
                    key={patient.id}
                    before={<UserRound size={22} />}
                    title={patient.fullName}
                    subtitle={dateISOFormat(patient.birthDate, "dd.MM.yyyy")}
                    selected={patient.id === me?.patient_id}
                    showChevron={patient.id !== me?.patient_id}
                    disabled={Boolean(patientSwitchBusy)}
                    onClick={() => handleSwitchPatient(patient.id)}
                    after={patientSwitchBusy === patient.id ? <RefreshCw size={18} /> : null}
                  />
                ))}
              </CellList>
            </Stack>
          </Card>
        ) : null}

        <Card>
          <CellList>
            <CellSimple title={<Link className="legalLink" to="/privacy-policy">Политика обработки персональных данных</Link>} />
            <CellSimple title={<Link className="legalLink" to="/personal-data-consent">Согласие на обработку персональных данных</Link>} />
          </CellList>
        </Card>

        <Card>
          <Stack gap={10}>
            <Typography.Title level={3}>Версия</Typography.Title>
            <div className="versionGrid">
              <VersionRow label="Frontend" value={FRONTEND_BUILD.appVersion} />
              <VersionRow label="Frontend commit" value={FRONTEND_BUILD.gitCommit} />
              <VersionRow label="Frontend build" value={FRONTEND_BUILD.buildTime} />
              <VersionRow label="Backend" value={backendVersion?.backendVersion || backendVersion?.appVersion} />
              <VersionRow label="Backend commit" value={backendVersion?.gitCommit} />
              <VersionRow label="Backend build" value={backendVersion?.buildTime} />
            </div>
          </Stack>
        </Card>

        {error ? <Typography.Label className="authErrorLabel">{error}</Typography.Label> : null}

        <Button mode="secondary" className="dangerBtn" onClick={handleLogout} disabled={busy} stretched>
          <LogOut size={18} />
          {busy ? "Выходим..." : "Выйти"}
        </Button>
      </Stack>
    </PageLayout>
  );
}
