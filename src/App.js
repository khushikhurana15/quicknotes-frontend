import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import your page components
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotePage from './pages/NotePage';
import ArchivePage from './pages/ArchivePage';
import PublicNoteView from './pages/PublicNoteView'; // NEW: Import PublicNoteView

// Import other necessary components/styles
import './App.css';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  // State for managing the application theme (light/dark)
  const [theme, setTheme] = useState(() => {
    // Initialize theme from localStorage, or default to 'light'
    return localStorage.getItem("theme") || "light";
  });

  // Effect to apply the theme to the document body and save it to localStorage
  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]); // Re-run effect when theme changes

  // Function to toggle between 'light' and 'dark' themes
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // PrivateRoute component for protecting routes that require authentication
  const PrivateRoute = ({ children }) => {
    // Check if a token exists in localStorage
    const isAuthenticated = localStorage.getItem("token");
    // If authenticated, render children; otherwise, redirect to login page
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <ErrorBoundary> {/* ErrorBoundary to catch UI errors */}
        <Routes>
          {/* Public Routes (no authentication required) */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* NEW: Public route for viewing shared notes */}
          {/* This route does NOT use PrivateRoute because it's meant for public access */}
          <Route path="/share/:shareId" element={<PublicNoteView />} />

          {/* Protected Routes (require authentication via PrivateRoute) */}
          <Route
            path="/notes"
            element={
              <PrivateRoute>
                {/* NotePage receives theme and toggle function */}
                <NotePage toggleTheme={toggleTheme} currentTheme={theme} />
              </PrivateRoute>
            }
          />
          <Route
            path="/archive"
            element={
              <PrivateRoute>
                {/* ArchivePage is also protected. Theme is inherited from body class. */}
                <ArchivePage />
              </PrivateRoute>
            }
          />

          {/* Fallback Route: Redirects any unmatched paths to the login page */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </ErrorBoundary>

      {/* ToastContainer for displaying notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000} // Notifications close after 3 seconds
        hideProgressBar // Hide the progress bar
        theme={theme === 'dark' ? 'dark' : 'light'} // Toast theme matches app theme
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Router>
  );
}

export default App;