import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AnimatePresence } from 'framer-motion';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import LibraryPage from './pages/LibraryPage';
import QueryPage from './pages/QueryPage';
import ProfilePage from './pages/ProfilePage';
import PdfToolsPage from './pages/PdfToolsPage';
import AnalyticsPage from './pages/AnalyticsPage';

import ProtectedRoute from './components/ProtectedRoute';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import './App.css';

function LocationAnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
        <Route path="/query" element={<ProtectedRoute><QueryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/tools" element={<ProtectedRoute><PdfToolsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
            },
          }}
        />
        <KeyboardShortcuts />
        <LocationAnimatedRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
