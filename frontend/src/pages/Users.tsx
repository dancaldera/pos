import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';
import { User, Role } from '../types/auth';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../context/LanguageContext';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const ROLE_NAMES: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  waitress: 'Waitress',
};

const Users: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'waitress' as Role,
    active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users when search changes
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lowerSearch = search.toLowerCase().trim();
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch) ||
        ROLE_NAMES[user.role].toLowerCase().includes(lowerSearch)
    );
    setFilteredUsers(filtered);
  }, [search, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'waitress',
      active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      active: user.active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const { translate } = useLanguage();

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = translate.users('nameRequired');
    }

    if (!formData.email.trim()) {
      errors.email = translate.users('emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = translate.common('error');
    }

    // If creating new user or password field is filled
    if (!selectedUser || formData.password) {
      if (!selectedUser && !formData.password) {
        errors.password = translate.users('passwordRequired');
      } else if (formData.password.length < 6) {
        errors.password = translate.common('error');
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = translate.common('error');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitLoading(true);

      // Create user data object, omitting confirmPassword
      const { confirmPassword, ...userData } = formData;
      
      // For updates, only include the password if it's not empty
      const dataToSend = selectedUser 
        ? { ...userData, password: userData.password || undefined } 
        : userData;
      
      if (selectedUser) {
        // Update user
        await updateUser(selectedUser.id, dataToSend);
      } else {
        // Create user
        await createUser(dataToSend);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      // Handle API error response
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('Email already registered')) {
          setFormErrors({
            ...formErrors,
            email: translate.users('emailExists'),
          });
        } else {
          setFormErrors({
            ...formErrors,
            form: error.response.data.message,
          });
        }
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      setSubmitLoading(true);
      await deleteUser(selectedUser.id);
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{translate.users('title')}</h1>
        <Button variant="primary" onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          {translate.users('addUser')}
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder={translate.users('searchUsers')}
            className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            value={search}
            onChange={handleSearchChange}
          />
          <div className="absolute right-3 top-2.5 text-gray-400">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common('loading')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table
            headers={[
              translate.common('name'), 
              translate.auth('email'), 
              translate.users('userRole'), 
              translate.common('status'), 
              translate.common('created'), 
              translate.common('actions')
            ]}
          >
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {translate.common('noResults')}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'manager'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ROLE_NAMES[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.active ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                        {translate.common('active')}
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <XCircleIcon className="h-5 w-5 mr-1" />
                        {translate.common('inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2 justify-end">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={user.id === currentUser?.id}
                        title={user.id === currentUser?.id ? translate.common('error') : translate.common('edit')}
                      >
                        <PencilIcon className={`h-5 w-5 ${user.id === currentUser?.id ? 'opacity-40 cursor-not-allowed' : ''}`} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="text-red-600 hover:text-red-900"
                        disabled={user.id === currentUser?.id}
                        title={user.id === currentUser?.id ? translate.common('error') : translate.common('delete')}
                      >
                        <TrashIcon className={`h-5 w-5 ${user.id === currentUser?.id ? 'opacity-40 cursor-not-allowed' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </Table>
        </div>
      )}

      {/* User Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedUser ? translate.users('editUser') : translate.users('addUser')}
        footer={
          <>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={submitLoading}
              className="ml-3"
            >
              {selectedUser ? translate.common('save') : translate.common('add')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitLoading}
            >
              {translate.common('cancel')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formErrors.form}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate.users('userName')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={translate.users('userName')}
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate.users('userEmail')} *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={translate.users('userEmail')}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate.users('userRole')} *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="admin">{translate.users('admin')}</option>
              <option value="manager">{translate.users('manager')}</option>
              <option value="waitress">{translate.users('waitress')}</option>
            </select>
          </div>

          {/* Password - required for new user, optional for edit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {selectedUser ? translate.users('userPassword') : translate.users('userPassword') + ' *'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={translate.users('userPassword')}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translate.users('userPassword')} ({translate.common('confirm')})
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={translate.users('userPassword')}
            />
            {formErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {formErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
              {translate.users('userActive')}
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={translate.common('delete')}
        footer={
          <>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={submitLoading}
              className="ml-3"
            >
              {translate.common('delete')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitLoading}
            >
              {translate.common('cancel')}
            </Button>
          </>
        }
      >
        <div className="py-4">
          <p className="text-gray-600">
            {translate.users('deleteConfirmation')}
            <br />
            <span className="font-medium text-gray-900">
              {selectedUser?.name}
            </span>
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default Users;