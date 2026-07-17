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
import { isPageVisible } from "./modules/featureVisibility.js";

function PageVisibilityRoute({ page, children }) {
  const { me, loading, isAuthorized } = useAuth();

  if (!loading && isAuthorized && !isPageVisible(me, page)) {
    return <Navigate to="/" replace />;
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
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<BookVisit />} />
          <Route path="/book/flow" element={<BookVisitFlow />} />
          <Route path="/book/summary" element={<BookVisitSummary />} />
          <Route path="/visits" element={<MyVisits />} />
          <Route path="/visits/:id" element={<VisitDetails />} />
          <Route path="/history" element={<Navigate to="/medcard" replace />} />
          <Route path="/medcard" element={<History />} />
          <Route
            path="/bonuses"
            element={(
              <PageVisibilityRoute page="bonuses">
                <Bonuses />
              </PageVisibilityRoute>
            )}
          />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/surveys"
            element={(
              <PageVisibilityRoute page="survey">
                <MySurveys />
              </PageVisibilityRoute>
            )}
          />
          <Route
            path="/surveys/:id"
            element={(
              <PageVisibilityRoute page="survey">
                <SurveyDetails />
              </PageVisibilityRoute>
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
