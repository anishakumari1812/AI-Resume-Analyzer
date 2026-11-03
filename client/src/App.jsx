import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Demo from "./pages/Demo";
import AnalyzerWorkspace from "./pages/AnalyzerWorkspace";
import InterviewPreparation from "./pages/InterviewPreparation";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import MyRoadmaps from "./pages/MyRoadmaps";

function App() {
  const token = localStorage.getItem("token");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Demo />} />

        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" /> : <Login />}
        />

        <Route
          path="/signup"
          element={token ? <Navigate to="/dashboard" /> : <Signup />}
        />

        <Route
          path="/dashboard"
          element={token ? <Dashboard /> : <Navigate to="/login" />}
        />

        <Route
          path="/analyzer"
          element={token ? <AnalyzerWorkspace demoMode={false} /> : <Navigate to="/login" />}
        />

        <Route
          path="/interview-preparation"
          element={token ? <InterviewPreparation /> : <Navigate to="/login" />}
        />

        <Route
          path="/skill-gap-analysis"
          element={token ? <SkillGapAnalysis /> : <Navigate to="/login" />}
        />

        <Route
          path="/history"
          element={token ? <History /> : <Navigate to="/login" />}
        />
        <Route
          path="/my-roadmaps"
          element={token ? <MyRoadmaps /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
