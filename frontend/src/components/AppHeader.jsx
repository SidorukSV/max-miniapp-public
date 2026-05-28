import { useEffect, useState } from "react";
import { Typography } from "@maxhub/max-ui";
import "../App.css";

export default function AppHeader({
    title = "",
    logoSrc = "/logo-clinic-aldenta.png",
    roundedLogo = false
}) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY || document.documentElement.scrollTop || 0;
            setScrolled(y > 0);
        }

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className={`Header ${scrolled ? "Header--scrolled" : ""}`}>
            <div className="HeaderInner">
                <img
                    src={logoSrc}
                    alt={title}
                    className={`clinicLogo ${roundedLogo ? "clinicLogo-rounded" : ""}`}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <Typography.Label className="clinicTitle">
                    {title}
                </Typography.Label>
            </div>
        </div>
    );
}

