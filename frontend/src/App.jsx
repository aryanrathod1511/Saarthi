import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { InterviewProvider } from './contexts/InterviewContext.jsx';
import { ToastContainer } from './components/common';

function App() {
  return (
    <InterviewProvider>
      <div className="App min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30">
        <ToastContainer position="top-right" />
        <Navbar />
        <main className="pt-20">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </InterviewProvider>
  );
}

export default App; 