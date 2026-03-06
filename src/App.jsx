import React from 'react';
import { Routes, Route } from 'react-router-dom';
import KioskFlow from './pages/KioskFlow';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { LanguageProvider } from './context/LanguageContext';

import VersionFooter from './components/VersionFooter';
import ImageCache from './components/ImageCache';
import { useProducts } from './context/ProductContext';
import saver from './assets/saver.png';
import logo from './assets/logo.png';

const AppLoader = ({ children }) => {
  const { isAssetsCached, syncProgress, syncMessage } = useProducts();

  if (!isAssetsCached) {
    return (
      <div
        className="h-screen w-full relative overflow-hidden bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center"
        style={{ backgroundImage: `url(${saver})` }}
      >
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-0" />

        <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
          <img src={logo} alt="Logo" className="w-80 h-auto object-contain drop-shadow-xl mb-8 animate-pulse" />

          <div className="flex flex-col items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute w-full h-full border-4 border-[#c28744]/30 rounded-full"></div>
              <div
                className="absolute w-full h-full border-4 border-[#c28744] border-t-transparent rounded-full animate-spin shadow-lg"
              ></div>
              <span className="text-[#2C1A0F] font-bold text-sm z-10">{syncProgress}%</span>
            </div>

            <h1 className="text-4xl font-serif font-black text-[#2C1A0F] drop-shadow-md tracking-wide mt-4">
              Cargando el sabor...
            </h1>
            <p className="text-xl font-medium text-[#2C1A0F]/80 tracking-wide">
              {syncMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default function App() {
  return (
    <LanguageProvider>
      <ImageCache />
      <AppLoader>
        <Routes>
          <Route path="/" element={<KioskFlow />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Routes>
      </AppLoader>
      <VersionFooter />
    </LanguageProvider>
  );
}
