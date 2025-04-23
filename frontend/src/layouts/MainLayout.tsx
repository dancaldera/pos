import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ShoppingCartIcon,
  SquaresPlusIcon,
  UsersIcon,
  UserGroupIcon,
  ArrowLeftOnRectangleIcon,
  Cog6ToothIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';

const MainLayout: React.FC = () => {
  const { state, logout } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ensure user is authenticated
  const { user } = state;
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define navigation items based on user role
  const navigation = [
    { name: translate.dashboard('title'), to: '/', icon: HomeIcon, requiredRole: ['admin', 'manager'] },
    { name: translate.orders('title'), to: '/orders', icon: ShoppingCartIcon },
    { name: translate.products('title'), to: '/products', icon: SquaresPlusIcon, requiredRole: ['admin', 'manager'] },
    { name: translate.categories('title'), to: '/categories', icon: ChartBarSquareIcon, requiredRole: ['admin', 'manager'] },
    { name: translate.customers('title'), to: '/customers', icon: UserGroupIcon },
    { name: translate.users('title'), to: '/users', icon: UsersIcon, requiredRole: ['admin'] },
    { name: translate.settings('title'), to: '/settings', icon: Cog6ToothIcon, requiredRole: ['admin'] },
  ];

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => {
    if (!item.requiredRole) return true;
    if (isAdmin) return true;
    if (isManager && item.requiredRole.includes('manager')) return true;
    return false;
  });

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 flex md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-white text-xl font-bold">{translate.layout('pos')}</h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {filteredNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    `${isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className="mr-4 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md w-full"
              >
                <ArrowLeftOnRectangleIcon
                  className="mr-4 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                  aria-hidden="true"
                />
                {translate.auth('logout')}
              </button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex p-4 bg-gray-700">
            <div className="flex-shrink-0 group block w-full">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <div className="inline-block h-9 w-9 rounded-full bg-gray-500 text-white flex items-center justify-center">
                    {user?.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-white">{user?.name}</p>
                    <p className="text-sm font-medium text-gray-400 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 w-14"></div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-gray-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-white text-xl font-bold">{translate.layout('pos')}</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {filteredNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    className={({ isActive }) =>
                      `${isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md`
                    }
                  >
                    <item.icon
                      className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                      aria-hidden="true"
                    />
                    {item.name}
                  </NavLink>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full"
                >
                  <ArrowLeftOnRectangleIcon
                    className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300"
                    aria-hidden="true"
                  />
                  {translate.auth('logout')}
                </button>
              </nav>
            </div>
            <div className="flex-shrink-0 flex p-4 bg-gray-700">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center">
                    <div className="inline-block h-9 w-9 rounded-full bg-gray-500 text-white flex items-center justify-center">
                      {user?.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs font-medium text-gray-300 capitalize">{user?.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100 shadow">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
