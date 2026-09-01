import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import BookVisit from "./pages/BookVisit.jsx";
import BookVisitFlow from "./pages/BookVisitFlow.jsx";
import BookVisitSummary from "./pages/BookVisitSummary.jsx";
import MyVisits from "./pages/MyVisits.jsx";
import VisitDetails from "./pages/VisitDetails.jsx";
import History from "./pages/History.jsx";
import Bonuses from "./pages/Bonuses.jsx";
import Profile from "./pages/Profile.jsx";
import MySurveys from "./pages/MySurveys.jsx";
import SurveyDetails from "./pages/SurveyDetails.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import PersonalDataConsent from "./pages/PersonalDataConsent.jsx";
import NotFound from "./pages/NotFound.jsx";
import PayloadSurveyRedirect from "./components/PayloadSurveyRedirect.jsx";
import { useMaxWebApp } from "./hooks/useMaxWebApp.js";
import { MaxContext } from "./context/MaxContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import CommunicationConsent from "./pages/CommunicationCosent.jsx";
import DoctorSchedule from "./pages/DoctorSchedule.jsx";
import { isPageVisible } from "./modules/featureVisibility.js";

function PageVisibilityRoute({ page, children }) {
  const { me, loading, isAuthorized } = useAuth();

  if (!loading && isAuthorized && !isPageVisible(me, page)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PatientRoute({ children }) {
  const { me, loading } = useAuth();
  if (!loading && me?.actor_type === "employee") {
    return <Navigate to="/doctor" replace />;
  }
  return children;
}

function AppContent() {
  const max = useMaxWebApp();

  return (
    <MaxContext.Provider value={max}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <PayloadSurveyRedirect />
        <Routes>
          <Route path="/" element={<ActorHome />} />
          <Route path="/doctor" element={<DoctorSchedule />} />
          <Route path="/book" element={<PatientRoute><BookVisit /></PatientRoute>} />
          <Route path="/book/flow" element={<PatientRoute><BookVisitFlow /></PatientRoute>} />
          <Route path="/book/summary" element={<PatientRoute><BookVisitSummary /></PatientRoute>} />
          <Route path="/visits" element={<PatientRoute><MyVisits /></PatientRoute>} />
          <Route path="/visits/:id" element={<PatientRoute><VisitDetails /></PatientRoute>} />
          <Route path="/history" element={<Navigate to="/medcard" replace />} />
          <Route path="/medcard" element={<PatientRoute><History /></PatientRoute>} />
          <Route
            path="/bonuses"
            element={(
              <PatientRoute><PageVisibilityRoute page="bonuses">
                <Bonuses />
              </PageVisibilityRoute></PatientRoute>
            )}
          />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/surveys"
            element={(
              <PatientRoute><PageVisibilityRoute page="survey">
                <MySurveys />
              </PageVisibilityRoute></PatientRoute>
            )}
          />
          <Route
            path="/surveys/:id"
            element={(
              <PatientRoute><PageVisibilityRoute page="survey">
                <SurveyDetails />
              </PageVisibilityRoute></PatientRoute>
            )}
          />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/personal-data-consent" element={<PersonalDataConsent />} />
          <Route path="/communication-consent" element={<CommunicationConsent />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </MaxContext.Provider>
  );
}

function ActorHome() {
  const { me, loading } = useAuth();
  if (!loading && me?.actor_type === "employee") {
    return <Navigate to="/doctor" replace />;
  }
  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
