import {
  FaBrain,
  FaBriefcaseMedical,
  FaChild,
  FaCut,
  FaEye,
  FaHandHoldingMedical,
  FaHeartbeat,
  FaMars,
  FaMicroscope,
  FaSpa,
  FaStethoscope,
  FaSyringe,
  FaTooth,
  FaUserMd,
  FaVenus,
  FaVial,
  FaXRay,
} from "react-icons/fa";

function normalizeIconCode(iconCode) {
  return String(iconCode || "").trim();
}

export function SpecializationIcon({ iconCode, size = 30 }) {
  switch (normalizeIconCode(iconCode)) {
    case "therapy":
      return <FaStethoscope size={size} />;
    case "doctor":
      return <FaUserMd size={size} />;
    case "cardiology":
      return <FaHeartbeat size={size} />;
    case "dentistry":
      return <FaTooth size={size} />;
    case "surgery":
      return <FaBriefcaseMedical size={size} />;
    case "gynecology":
      return <FaVenus size={size} />;
    case "urology":
      return <FaMars size={size} />;
    case "neurology":
      return <FaBrain size={size} />;
    case "ophthalmology":
      return <FaEye size={size} />;
    case "pediatrics":
      return <FaChild size={size} />;
    case "lab":
      return <FaVial size={size} />;
    case "diagnostics":
      return <FaMicroscope size={size} />;
    case "xray":
      return <FaXRay size={size} />;
    case "vaccination":
      return <FaSyringe size={size} />;
    case "cosmetology":
      return <FaSpa size={size} />;
    case "trichology":
      return <FaCut size={size} />;
    case "physiotherapy":
      return <FaHandHoldingMedical size={size} />;
    default:
      return <FaStethoscope size={size} />;
  }
}
