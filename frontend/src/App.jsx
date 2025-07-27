import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import InterviewFormPage from './pages/InterviewFormPage.jsx';
import InterviewSessionPage from './pages/InterviewSessionPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AuthCallback from './components/auth/AuthCallback.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import { InterviewProvider } from './contexts/InterviewContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastContainer } from './components/common';

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <div className="App min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-secondary-50/30">
          <ToastContainer position="top-right" />
          <Navbar />
          <main className="pt-20">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={
                <ProtectedRoute requireAuth={false}>
                  <LoginPage />
                </ProtectedRoute>
              } />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/interview" element={
                <ProtectedRoute>
                  <InterviewFormPage />
                </ProtectedRoute>
              } />
              <Route 
                path="/interview/session" 
                element={
                  <ProtectedRoute>
                    <InterviewSessionPage />
                  </ProtectedRoute>
                } 
              />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/interview/*" element={<Navigate to="/interview" replace />} />
            </Routes>
          </main>
        </div>
      </InterviewProvider>
    </AuthProvider>
  );
}

export default App; 