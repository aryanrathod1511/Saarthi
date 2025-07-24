import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import InterviewFormPage from './pages/InterviewFormPage.jsx';
import InterviewSessionPage from './pages/InterviewSessionPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { InterviewProvider } from './contexts/InterviewContext.jsx';
import { ToastContainer } from './components/common';

// Route guard component
const SessionRouteGuard = ({ children }) => {
  
  return children;
};

function App() {
  return (
    <InterviewProvider>
      <div className="App min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30">
        <ToastContainer position="top-right" />
        <Navbar />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/interview" element={<InterviewFormPage />} />
            <Route 
              path="/interview/session" 
              element={
                <SessionRouteGuard>
                  <InterviewSessionPage />
                </SessionRouteGuard>
              } 
            />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/interview/*" element={<Navigate to="/interview" replace />} />
          </Routes>
        </main>
      </div>
    </InterviewProvider>
  );
}

export default App; 