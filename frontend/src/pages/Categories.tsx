import { Button } from '@/components/button';
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog';
import { Divider } from '@/components/divider';
import { Field, Fieldset, Label } from '@/components/fieldset';
import { Heading } from '@/components/heading';
import { Input } from '@/components/input';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/table';
import { Text } from '@/components/text';
import { Textarea } from '@/components/textarea';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';
import {
  CategorySearchParams,
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory
} from '../api/categories';
import { useLanguage } from '../context/LanguageContext';
import { Category } from '../types/products';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Pick<Category, 'name' | 'description'>>({
    name: '',
    description: '',
  });
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useState<CategorySearchParams>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch categories on mount and when search params change
  useEffect(() => {
    fetchCategories();
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategories(searchParams);
      setCategories(response.data);
      setPagination({
        page: parseInt(response.pagination.page),
        limit: parseInt(response.pagination.limit),
        totalPages: response.pagination.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      search,
      page: 1 // Reset to first page when searching
    });
  };

  const handleSortChange = (column: string) => {
    const newSortOrder = searchParams.sortBy === column && searchParams.sortOrder === 'asc' ? 'desc' : 'asc';
    setSearchParams({
      ...searchParams,
      sortBy: column,
      sortOrder: newSortOrder
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setSearchParams(prevParams => ({
      ...prevParams,
      page: newPage
    }));
  };

  const openCreateModal = () => {
    setCurrentCategory(null);
    setFormData({
      name: '',
      description: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setCurrentCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const { translate } = useLanguage();

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = translate.categories('nameRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitLoading(true);

      if (currentCategory) {
        // Update category
        await updateCategory(currentCategory.id, formData);
      } else {
        // Create category
        await createCategory(formData);
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      // Handle API error response
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('already exists')) {
          setFormErrors({
            name: translate.categories('nameExists')
          });
        }
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCategory) return;

    try {
      setSubmitLoading(true);
      await deleteCategory(currentCategory.id);
      setIsDeleteModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      // Handle the case where category has associated products
      if (error.response?.data?.message && error.response.data.message.includes('Cannot delete category with associated products')) {
        alert('Cannot delete this category because it has associated products. Please remove or reassign all products first.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const getSortIcon = (column: string) => {
    if (searchParams.sortBy !== column) return null;

    return searchParams.sortOrder === 'asc'
      ? <span className="ml-1">↑</span>
      : <span className="ml-1">↓</span>;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>{translate.categories('title')}</Heading>
        <Button
          onClick={openCreateModal}
        >
          <PlusIcon className="h-5 w-5 mr-1" />
          {translate.categories('addCategory')}
        </Button>
      </div>

      {/* Search */}

      <Input
        type="text"
        placeholder={translate.categories('searchCategories')}
        value={search}
        onChange={handleSearchChange}
        className='mb-4'
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />

      {/* Categories Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <Text>{translate.common('loading')}</Text>
        </div>
      ) : (
        <>
          <div className="rounded-lg shadow overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>
                    <div className="cursor-pointer flex items-center" onClick={() => handleSortChange('name')}>
                      {translate.common('name')} {getSortIcon('name')}
                    </div>
                  </TableHeader>
                  <TableHeader>{translate.common('description')}</TableHeader>
                  <TableHeader>
                    <div className="cursor-pointer flex items-center" onClick={() => handleSortChange('productCount')}>
                      {translate.categories('productsInCategory')} {getSortIcon('productCount')}
                    </div>
                  </TableHeader>
                  <TableHeader>
                    <div className="cursor-pointer flex items-center" onClick={() => handleSortChange('createdAt')}>
                      {translate.common('created')} {getSortIcon('createdAt')}
                    </div>
                  </TableHeader>
                  <TableHeader>{translate.common('actions')}</TableHeader>
                </TableRow>
              </TableHead>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {translate.common('noResults')}
                  </td>
                </tr>
              ) : (
                categories.map(category => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Text className="font-medium">{category.name}</Text>
                    </TableCell>
                    <TableCell>
                      <Text className="line-clamp-2">
                        {category.description || '-'}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text>{category.productCount || 0}</Text>
                    </TableCell>
                    <TableCell>
                      <Text>{new Date(category.createdAt).toLocaleDateString()}</Text>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2 justify-end">
                        <Button
                          onClick={() => openEditModal(category)}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </Button>
                        <Button
                          color="red"
                          onClick={() => openDeleteModal(category)}
                          disabled={category.productCount ? category.productCount > 0 : false}
                          title={category.productCount && category.productCount > 0 ? "Categories with products cannot be deleted" : ""}
                        >
                          <TrashIcon className={`h-5 w-5 ${category.productCount && category.productCount > 0 ? 'opacity-40 cursor-not-allowed' : ''}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                {pagination.total > 0 ?
                  `${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} / ${pagination.total}` : "0"} {translate.categories('title').toLowerCase()}
              </div>
              <div className="flex space-x-2">
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  {translate.common('previous')}
                </Button>
                <div className="mx-2 flex items-center">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                </div>
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  {translate.common('next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Category Form Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <DialogTitle>
          {currentCategory ? translate.categories('editCategory') : translate.categories('addCategory')}
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
                <Label>
                  {translate.categories('categoryName')} *
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={translate.categories('categoryName')}
                />
                {formErrors.name && (
                  <Text className="mt-1 text-sm text-red-600">{formErrors.name}</Text>
                )}
              </Field>

              {/* Description */}
              <Field>
                <Label>
                  {translate.categories('categoryDescription')}
                </Label>
                <Textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder={translate.categories('categoryDescription')}
                />
              </Field>
            </Fieldset>
          </form>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleSubmit}
            disabled={submitLoading}
            className="ml-3"
          >
            {currentCategory ? translate.common('save') : translate.common('add')}
          </Button>
          <Button
            outline
            onClick={() => setIsModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <DialogTitle>{translate.common('delete')}</DialogTitle>
        <DialogBody>
          <Text>
            {translate.categories('deleteConfirmation')}
            <Divider />
            <Text>
              {currentCategory?.name}
            </Text>
          </Text>
        </DialogBody>
        <DialogActions>
          <Button
            color="red"
            onClick={handleDelete}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.common('delete')}
          </Button>
          <Button
            outline
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common('cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Categories;