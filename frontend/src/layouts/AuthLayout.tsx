import React from 'react';
import { Outlet } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const AuthLayout: React.FC = () => {
  const { translate } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{translate.layout('appName')}</h1>
          <p className="text-gray-600">{translate.layout('appDescription')}</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
