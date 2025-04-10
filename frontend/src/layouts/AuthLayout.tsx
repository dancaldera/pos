import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Inventory POS</h1>
          <p className="text-gray-600">Inventory and Point of Sale System</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
