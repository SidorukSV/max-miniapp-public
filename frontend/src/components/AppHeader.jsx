import { useMemo, useState } from "react";

function buildLogoSrc() {
  const rawPath = import.meta.env.VITE_LOGO_PATH || "";
  if (!rawPath.trim()) return "";

  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = rawPath.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedPath}`;
}

export default function AppHeader({ title = "" }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const clinicName = import.meta.env.VITE_CLINIC_NAME || "Клиника";
  const logoSrc = useMemo(() => buildLogoSrc(), []);
  const showLogo = Boolean(logoSrc) && !logoFailed;

  return (
    <header className="appHeader">
      <div className="appHeader__inner">
        <div className="clinicBrand" aria-label={clinicName}>
          <span className="clinicLogoWrap">
            {showLogo ? (
              <img
                src={logoSrc}
                alt={clinicName}
                className="clinicLogo"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="clinicLogoFallback">{clinicName.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <span className="clinicTitle">{clinicName}</span>
        </div>
        {title ? <span className="headerTitle">{title}</span> : null}
      </div>
    </header>
  );
}
