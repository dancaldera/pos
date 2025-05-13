import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../context/LanguageContext';
import { SidebarLayout } from '../components/sidebar-layout';
import { Sidebar, SidebarItem, SidebarSection, SidebarHeader, SidebarBody, SidebarFooter, SidebarLabel } from '../components/sidebar';
import { Avatar } from '../components/avatar';
import { Navbar, NavbarSection } from '../components/navbar';
import {
  HomeIcon,
  ShoppingCartIcon,
  SquaresPlusIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Ensure user is authenticated
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

  // Create the sidebar content
  const sidebarContent = (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center">
          <Heading level={2}>{translate.layout('pos')}</Heading>
        </div>
      </SidebarHeader>
      <SidebarBody>
        <SidebarSection>
          {filteredNavigation.map((item) => (
            <SidebarItem 
              key={item.name} 
              href={item.to} 
              current={location.pathname === item.to}
            >
              <item.icon data-slot="icon" aria-hidden="true" />
              <SidebarLabel>{item.name}</SidebarLabel>
            </SidebarItem>
          ))}
          <SidebarItem onClick={handleLogout}>
            <SidebarLabel>{translate.auth('logout')}</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>
      <SidebarFooter>
        <SidebarSection>
          <div className="flex items-center gap-3">
            <Avatar 
              initials={user?.name?.charAt(0) || '?'} 
              className="size-9 bg-zinc-500 text-white"
            />
            <div>
              <Text>{user?.name}</Text>
              <Text className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{user?.role}</Text>
            </div>
          </div>
        </SidebarSection>
      </SidebarFooter>
    </Sidebar>
  );

  // Create the navbar content
  const navbarContent = (
    <Navbar>
      <NavbarSection>
        <div className="flex items-center">
          <Heading level={2}>{translate.layout('pos')}</Heading>
        </div>
      </NavbarSection>
    </Navbar>
  );

  return (
    <SidebarLayout
      sidebar={sidebarContent}
      navbar={navbarContent}
    >
      <Outlet />
    </SidebarLayout>
  );
};

export default MainLayout;
