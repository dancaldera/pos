import React from 'react';

const LoadingPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-white">Loading...</h2>
        <p className="text-zinc-500 mt-2 dark:text-zinc-400">Please wait while we prepare your content</p>
      </div>
    </div>
  );
};

export default LoadingPage;
