import {
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Checkbox } from '@/components/checkbox'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Divider } from '@/components/divider'
import { Field, Fieldset, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { Text } from '@/components/text'
import { createUser, deleteUser, getUsers, updateUser } from '../api/users'
import { useLanguage } from '../context/LanguageContext'
import { useAuthStore } from '../store/authStore'
import type { Role, User } from '../types/auth'

const ROLE_NAMES: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  waitress: 'Waitress',
}

const Users: React.FC = () => {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [search, setSearch] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [submitLoading, setSubmitLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'waitress' as Role,
    active: true,
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Fetch users on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchUsers is stable
  useEffect(() => {
    fetchUsers()
  }, [])

  // Filter users when search changes
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users)
      return
    }

    const lowerSearch = search.toLowerCase().trim()
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerSearch) ||
        user.email.toLowerCase().includes(lowerSearch) ||
        ROLE_NAMES[user.role].toLowerCase().includes(lowerSearch)
    )
    setFilteredUsers(filtered)
  }, [search, users])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await getUsers()
      setUsers(response.data)
      setFilteredUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const openCreateModal = () => {
    setSelectedUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'waitress',
      active: true,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      active: user.active,
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: target.checked,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const { translate } = useLanguage()

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = translate.users('nameRequired')
    }

    if (!formData.email.trim()) {
      errors.email = translate.users('emailRequired')
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = translate.common('error')
    }

    // If creating new user or password field is filled
    if (!selectedUser || formData.password) {
      if (!selectedUser && !formData.password) {
        errors.password = translate.users('passwordRequired')
      } else if (formData.password.length < 6) {
        errors.password = translate.common('error')
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = translate.common('error')
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSubmitLoading(true)

      // Create user data object, omitting confirmPassword
      const { confirmPassword: _confirmPassword, ...userData } = formData

      // For updates, only include the password if it's not empty
      const dataToSend = selectedUser
        ? { ...userData, password: userData.password || undefined }
        : userData

      if (selectedUser) {
        // Update user
        await updateUser(selectedUser.id, dataToSend)
      } else {
        // Create user
        await createUser(dataToSend)
      }

      setIsModalOpen(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Error saving user:', error)
      // Handle API error response
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('Email already registered')) {
          setFormErrors({
            ...formErrors,
            email: translate.users('emailExists'),
          })
        } else {
          setFormErrors({
            ...formErrors,
            form: error.response.data.message,
          })
        }
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return

    try {
      setSubmitLoading(true)
      await deleteUser(selectedUser.id)
      setIsDeleteModalOpen(false)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>{translate.users('title')}</Heading>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          {translate.users('addUser')}
        </Button>
      </div>

      {/* Search */}
      <Input
        type="text"
        placeholder={translate.users('searchUsers')}
        value={search}
        className="w-full mb-6"
        onChange={handleSearchChange}
      />

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <Text>{translate.common('loading')}</Text>
        </div>
      ) : (
        <div className="rounded-lg shadow overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{translate.common('name')}</TableHeader>
                <TableHeader>{translate.auth('email')}</TableHeader>
                <TableHeader>{translate.users('userRole')}</TableHeader>
                <TableHeader>{translate.common('status')}</TableHeader>
                <TableHeader>{translate.common('created')}</TableHeader>
                <TableHeader>{translate.common('actions')}</TableHeader>
              </TableRow>
            </TableHead>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {translate.common('noResults')}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Text>{user.name}</Text>
                  </TableCell>
                  <TableCell>
                    <Text>{user.email}</Text>
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={
                        user.role === 'admin' ? 'blue' : user.role === 'manager' ? 'purple' : 'teal'
                      }
                    >
                      {ROLE_NAMES[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <Badge color="green">
                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                        {translate.common('active')}
                      </Badge>
                    ) : (
                      <Badge color="red">
                        <XCircleIcon className="h-5 w-5 mr-1" />
                        {translate.common('inactive')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text>{formatDate(user.createdAt)}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 justify-end">
                      <Button
                        outline
                        onClick={() => openEditModal(user)}
                        disabled={user.id === currentUser?.id}
                        title={
                          user.id === currentUser?.id
                            ? translate.common('error')
                            : translate.common('edit')
                        }
                      >
                        <PencilIcon
                          className={`h-5 w-5 ${user.id === currentUser?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                        />
                      </Button>
                      <Button
                        color="red"
                        onClick={() => openDeleteModal(user)}
                        disabled={user.id === currentUser?.id}
                        title={
                          user.id === currentUser?.id
                            ? translate.common('error')
                            : translate.common('delete')
                        }
                      >
                        <TrashIcon
                          className={`h-5 w-5 ${user.id === currentUser?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </Table>
        </div>
      )}

      {/* User Form Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogTitle>
          {selectedUser ? translate.users('editUser') : translate.users('addUser')}
        </DialogTitle>
        <DialogBody>
          <form onSubmit={handleSubmit}>
            {formErrors.form && (
              <Text className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {formErrors.form}
              </Text>
            )}
            <Fieldset className="space-y-4">
              {/* Name */}
              <Field>
                <Label>{translate.users('userName')} *</Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={translate.users('userName')}
                />
                {formErrors.name && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.name}</Text>
                )}
              </Field>

              {/* Email */}
              <Field>
                <Label>{translate.users('userEmail')} *</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={translate.users('userEmail')}
                />
                {formErrors.email && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.email}</Text>
                )}
              </Field>

              {/* Role */}
              <Field>
                <Label>{translate.users('userRole')} *</Label>
                <Select name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="admin">{translate.users('admin')}</option>
                  <option value="manager">{translate.users('manager')}</option>
                  <option value="waitress">{translate.users('waitress')}</option>
                </Select>
              </Field>

              {/* Password - required for new user, optional for edit */}
              <Field>
                <Label>
                  {selectedUser
                    ? translate.users('userPassword')
                    : `${translate.users('userPassword')} *`}
                </Label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={translate.users('userPassword')}
                />
                {formErrors.password && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.password}</Text>
                )}
              </Field>

              {/* Confirm Password */}
              <Field>
                <Label>
                  {translate.users('userPassword')} ({translate.common('confirm')})
                </Label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder={translate.users('userPassword')}
                />
                {formErrors.confirmPassword && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</Text>
                )}
              </Field>

              {/* Active Status */}
              <Field>
                <Checkbox
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={(checked) => setFormData((prev) => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">{translate.users('userActive')}</Label>
              </Field>
            </Fieldset>
          </form>
        </DialogBody>
        <DialogActions>
          <Button onClick={handleSubmit} disabled={submitLoading} className="ml-3">
            {selectedUser ? translate.common('save') : translate.common('add')}
          </Button>
          <Button outline onClick={() => setIsModalOpen(false)} disabled={submitLoading}>
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <DialogTitle>{translate.common('delete')}</DialogTitle>
        <DialogBody>
          <Text>
            {translate.users('deleteConfirmation')}
            <Divider />
            <Text>{selectedUser?.name}</Text>
          </Text>
        </DialogBody>
        <DialogActions>
          <Button onClick={handleDelete} disabled={submitLoading} className="ml-3">
            {translate.common('delete')}
          </Button>
          <Button outline onClick={() => setIsDeleteModalOpen(false)} disabled={submitLoading}>
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default Users
