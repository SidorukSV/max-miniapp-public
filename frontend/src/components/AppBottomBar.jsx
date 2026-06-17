import { NavLink, useLocation } from "react-router-dom";
import { CalendarCheck, IdCard, LayoutGrid, QrCode, UserRound } from "lucide-react";

const TABS = [
  { to: "/", label: "Главная", icon: LayoutGrid, exact: true },
  { to: "/book", label: "Запись", icon: CalendarCheck },
  { to: "/bonuses", label: "Бонусы", icon: QrCode },
  { to: "/medcard", label: "Медкарта", icon: IdCard },
  { to: "/profile", label: "Профиль", icon: UserRound },
];

function isTabActive(pathname, tab) {
  if (tab.exact) return pathname === "/";
  if (tab.to === "/book") return pathname.startsWith("/book");
  return pathname === tab.to || pathname.startsWith(`${tab.to}/`);
}

export default function AppBottomBar() {
  const { pathname } = useLocation();

  return (
    <nav className="bottomTabBar" aria-label="Основное меню">
      <div className="bottomTabBar__inner">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(pathname, tab);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.exact}
              className={`bottomTab ${active ? "bottomTab--active" : ""}`}
            >
              <Icon size={25} aria-hidden="true" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
