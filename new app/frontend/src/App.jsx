import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HospitalProvider } from './context/HospitalContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './layouts/MainLayout';
import AdminPage from './pages/AdminPage';
import AssistantPage from './pages/AssistantPage';
import BedsPage from './pages/BedsPage';
import ComparePage from './pages/ComparePage';
import EmergencyPage from './pages/EmergencyPage';
import HomePage from './pages/HomePage';
import HospitalDetailsPage from './pages/HospitalDetailsPage';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import NearbyPage from './pages/NearbyPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SavedPage from './pages/SavedPage';
import ServicesPage from './pages/ServicesPage';
import SettingsPage from './pages/SettingsPage';
import SpecialtiesPage from './pages/SpecialtiesPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/specialties" element={<SpecialtiesPage />} />
        <Route path="/hospitals/:id" element={<HospitalDetailsPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/beds" element={<BedsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <LanguageProvider>
          <AuthProvider>
            <HospitalProvider>
              <AppRoutes />
            </HospitalProvider>
          </AuthProvider>
        </LanguageProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
