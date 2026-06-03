import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import BookVisit from "./pages/BookVisit.jsx";
import BookVisitFlow from "./pages/BookVisitFlow.jsx";
import BookVisitSummary from "./pages/BookVisitSummary.jsx";
import MyVisits from "./pages/MyVisits.jsx";
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
import { AuthProvider } from "./context/AuthContext.jsx";

export default function App() {

  const max = useMaxWebApp();

  return (
    <AuthProvider>
      <MaxContext.Provider value={max}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <PayloadSurveyRedirect />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book" element={<BookVisit />} />
            <Route path="/book/flow" element={<BookVisitFlow />} />
            <Route path="/book/summary" element={<BookVisitSummary />} />
            <Route path="/visits" element={<MyVisits />} />
            <Route path="/history" element={<Navigate to="/medcard" replace />} />
            <Route path="/medcard" element={<History />} />
            <Route path="/bonuses" element={<Bonuses />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/surveys" element={<MySurveys />} />
            <Route path="/surveys/:id" element={<SurveyDetails />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/personal-data-consent" element={<PersonalDataConsent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MaxContext.Provider>
    </AuthProvider>
  );
}
