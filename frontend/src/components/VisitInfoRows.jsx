import { BriefcaseMedical, MapPin, UserRound } from "lucide-react";

export function VisitInfoRow({ icon: Icon, primary, secondary = "" }) {
  const Component = Icon;

  return (
    <div className="visitInfoRow">
      <span className="visitInfoIcon" aria-hidden="true">
        <Component size={17} />
      </span>
      <span className="visitInfoText">
        <span className="visitInfoPrimary">{primary}</span>
        {secondary ? <span className="visitInfoSecondary">{secondary}</span> : null}
      </span>
    </div>
  );
}

export function DoctorInfoRow({ doctor, specialization }) {
  return <VisitInfoRow icon={UserRound} primary={doctor} secondary={specialization} />;
}

export function BranchInfoRow({ clinic, place = "" }) {
  const secondary = place && place !== "Кабинет не указан" ? place : "";
  return <VisitInfoRow icon={MapPin} primary={clinic} secondary={secondary} />;
}

export function ServicesInfoRow({ services }) {
  if (!services?.length) return null;
  return <VisitInfoRow icon={BriefcaseMedical} primary={services.join(", ")} />;
}
