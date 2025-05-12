import React from 'react';
import { Outlet } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Text } from '@/components/text';
import { Heading } from '@/components/heading';

const AuthLayout: React.FC = () => {
  const { translate } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Heading>{translate.layout('appName')}</Heading>
          <Text>{translate.layout('appDescription')}</Text>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
