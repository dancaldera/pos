import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@/components/dialog";
import { Field, Fieldset, Label } from "@/components/fieldset";
import { Heading } from "@/components/heading";
import { Input } from "@/components/input";
import { Select } from "@/components/select";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Text } from "@/components/text";
import { formatCurrency } from "@/utils/format-currency";
import {
  CheckCircleIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import React, { useEffect, useState } from "react";
import { getCategories } from "../api/categories";
import {
  ProductSearchParams,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../api/products";
import { useLanguage } from "../context/LanguageContext";
import { Product, ProductFormData } from "../types/products";
import { Textarea } from "@/components/textarea";

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    cost: 0,
    sku: "",
    barcode: "",
    categoryId: "",
    stock: 0,
    lowStockAlert: 0,
    active: true,
    hasVariants: false,
    variants: [],
    image: null,
    removeImage: false,
  });
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useState<ProductSearchParams>({
    page: 1,
    limit: 10,
    search: "",
    categoryId: "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch products on mount and when search params change
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts(searchParams);
      setProducts(response.data);
      setPagination({
        page: parseInt(response.pagination.page),
        limit: parseInt(response.pagination.limit),
        totalPages: response.pagination.totalPages,
        total: response.total,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getCategories({ limit: 100 });
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearch = () => {
    setSearchParams({
      ...searchParams,
      search,
      page: 1, // Reset to first page when searching
    });
  };

  const handleCategoryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams({
      ...searchParams,
      categoryId: e.target.value,
      page: 1, // Reset to first page when filtering
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    // Update search params with the new page number
    setSearchParams(prevParams => ({
      ...prevParams,
      page: newPage,
    }));
  };

  const openCreateModal = () => {
    setCurrentProduct(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      cost: 0,
      sku: "",
      barcode: "",
      categoryId: "",
      stock: 0,
      lowStockAlert: 0,
      active: true,
      hasVariants: false,
      variants: [],
      image: null,
      removeImage: false,
    });
    setImagePreview(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      cost: product.cost || 0,
      sku: product.sku || "",
      barcode: product.barcode || "",
      categoryId: product.categoryId || "",
      stock: product.stock,
      lowStockAlert: product.lowStockAlert || 0,
      active: product.active,
      hasVariants: product.hasVariants || false,
      variants: product.variants || [],
      image: null,
      removeImage: false,
    });
    setImagePreview(product.imageUrl);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (product: Product) => {
    setCurrentProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: target.checked,
      });
    } else if (type === "number") {
      setFormData({
        ...formData,
        [name]: value === "" ? 0 : parseFloat(value),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({
      ...formData,
      image: file,
      removeImage: false,
    });

    // Create preview URL
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setFormData({
      ...formData,
      image: null,
      removeImage: true,
    });
    setImagePreview(null);
  };

  const { translate } = useLanguage();

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = translate.products("nameRequired");
    }

    if (formData.price <= 0) {
      errors.price = translate.products("priceRequired");
    }

    if (formData.stock < 0) {
      errors.stock = translate.products("stockCannotBeNegative");
    }

    // Validate variants if hasVariants is true
    if (formData.hasVariants) {
      // Filter out empty variants or very short ones
      const validVariants = (formData.variants || []).filter(
        (v) => v.trim().length > 1
      );

      if (validVariants.length === 0) {
        errors.variants = translate.products("variantRequired");
      } else {
        // Update formData with only valid variants
        formData.variants = validVariants;
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

      // Create FormData object for file upload
      const productFormData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === "image" && value) {
          productFormData.append("image", value);
        } else if (key === "variants" && Array.isArray(value)) {
          // Handle variants array properly by converting to JSON string
          productFormData.append("variants", JSON.stringify(value));
        } else if (key === "hasVariants") {
          // Ensure boolean is properly passed
          productFormData.append("hasVariants", value ? "true" : "false");
        } else if (key !== "image" && value !== null && value !== undefined) {
          productFormData.append(key, String(value));
        }
      });

      if (currentProduct) {
        // Update product
        await updateProduct(currentProduct.id, productFormData);
      } else {
        // Create product
        await createProduct(productFormData);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProduct) return;

    try {
      setSubmitLoading(true);
      await deleteProduct(currentProduct.id);
      setIsDeleteModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Heading>{translate.products("title")}</Heading>
        <Button onClick={openCreateModal}>
          <PlusIcon className="h-5 w-5 mr-1" />
          {translate.products("addProduct")}
        </Button>
      </div>

      {/* Search and Filter */}
      
      <div className="flex justify-between items-center mb-6">
          <Input
            type="text"
            placeholder={translate.products("searchProducts")}
            value={search}
            onChange={handleSearchChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
          <div className="w-full md:w-64">
            <Select
              value={searchParams.categoryId}
              onChange={handleCategoryFilter}
            >
              <option value="">
                {translate.common("all")} {translate.categories("title")}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin h-10 w-10 mx-auto border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600">{translate.common("loading")}</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg shadow overflow-hidden">
            <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{translate.common("image")}</TableHeader>
                <TableHeader>{translate.common("name")}</TableHeader>
                <TableHeader>{translate.categories("title")}</TableHeader>
                <TableHeader>{translate.common("price")}</TableHeader>
                <TableHeader>{translate.products("productStock")}</TableHeader>
                <TableHeader>{translate.products("variants")}</TableHeader>
                <TableHeader>{translate.common("status")}</TableHeader>
                <TableHeader>{translate.common("actions")}</TableHeader>
              </TableRow>
            </TableHead>
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  {translate.common("noResults")}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                        <PhotoIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text>
                      {product.name}
                    </Text>
                    {product.sku && (
                      <Text className="text-xs text-gray-500">
                        SKU: {product.sku}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text>{product.category?.name || "-"}</Text>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm text-gray-900">
                      {formatCurrency(product.price)}
                    </Text>
                    {product.cost && (
                      <Text className="text-xs text-gray-500">
                        {translate.products("productCost")}:{" "}
                        {formatCurrency(product.cost)}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell>
                    <Text
                      className={`text-sm ${
                        product.lowStockAlert &&
                        product.stock <= product.lowStockAlert
                          ? "text-red-600 font-medium"
                          : "text-gray-900"
                      }`}
                    >
                      {product.stock}{" "}
                      {translate.products("inStock").toLowerCase()}
                    </Text>
                    {product.lowStockAlert && (
                      <Text>
                        {translate.products("lowStockAlert")}:{" "}
                        {product.lowStockAlert}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.hasVariants &&
                    product.variants &&
                    product.variants.length > 0 ? (
                      <Text>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.variants.length}{" "}
                          {translate.products("variantsAvailable")}
                        </span>
                        <Text className="mt-1 text-xs text-gray-500 max-w-[150px] truncate">
                          {product.variants.join(", ")}
                        </Text>
                      </Text>
                    ) : (
                      <Text>
                        {translate.common("no")}{" "}
                        {translate.products("variants")}
                      </Text>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.active ? (
                      <Badge color="green">
                        <CheckCircleIcon className="h-5 w-5 mr-1" />
                        {translate.common("active")}
                      </Badge>
                    ) : (
                      <Badge color="red">
                        <XCircleIcon className="h-5 w-5 mr-1" />
                        {translate.common("inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2 justify-end">
                      <Button
                        outline
                        onClick={() => openEditModal(product)}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Button>
                      <Button
                        color="red"
                        onClick={() => openDeleteModal(product)}
                      >
                        <TrashIcon className="h-5 w-5" />
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
                  `${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} / ${pagination.total}` : "0"} {translate.products("title").toLowerCase()}
              </div>
              <div className="flex space-x-2">
                <Button
                  outline
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  {translate.common("previous")}
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
                  {translate.common("next")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Form Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <DialogTitle>
          {currentProduct
            ? translate.products("editProduct")
            : translate.products("addProduct")
        }
        </DialogTitle>
        <DialogBody>
        <form onSubmit={handleSubmit}>
          {formErrors.form && (
            <Text className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {formErrors.form}
            </Text>
          )}
          <Fieldset className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Name */}
                <Field>
                  <Label>
                    {translate.products("productName")} *
                  </Label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={translate.products("productName")}
                  />
                  {formErrors.name && (
                    <Text className="mt-1 text-sm text-red-600">{formErrors.name}</Text>
                  )}
                </Field>

                {/* Description */}
                <Field>
                  <Label>
                    {translate.products("productDescription")}
                  </Label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder={translate.products("productDescription")}
                  />
                </Field>

                {/* Category */}
                <Field>
                  <Label>
                    {translate.products("productCategory")}
                  </Label>
                  <Select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                  >
                    <option value="">
                      {translate.common("select")}{" "}
                      {translate.categories("title").toLowerCase()}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Price and Cost */}
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>
                      {translate.products("productPrice")} *
                    </Label>
                    <Input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                    {formErrors.price && (
                      <Text className="mt-1 text-sm text-red-600">
                        {formErrors.price}
                      </Text>
                    )}
                  </Field>
                  <Field>
                    <Label>
                      {translate.products("productCost")}
                    </Label>
                    <Input
                      type="number"
                      name="cost"
                      value={formData.cost || ""}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </Field>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Image Upload */}
                <Field>
                  <Label>
                    {translate.products("productImage")}
                  </Label>
                  <div className="mt-1 flex items-center">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 w-32 border-2 border-dashed border-gray-300 rounded-md">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <div className="space-y-1 text-center">
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="text-xs text-gray-600">
                              {translate.products("uploadImage")}
                            </div>
                          </div>
                          <input
                            id="file-upload"
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </Field>

                {/* SKU and Barcode */}
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>
                      {translate.products("productSKU")}
                    </Label>
                    <Input
                      type="text"
                      name="sku"
                      value={formData.sku || ""}
                      onChange={handleInputChange}
                      placeholder={translate.products("productSKU")}
                    />
                  </Field>
                  <Field>
                    <Label>
                      {translate.products("productBarcode")}
                    </Label>
                    <Input
                      type="text"
                      name="barcode"
                      value={formData.barcode || ""}
                      onChange={handleInputChange}
                      placeholder={translate.products("productBarcode")}
                    />
                  </Field>
                </div>

                {/* Stock and Low Stock Alert */}
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>
                      {translate.products("stockQuantity")}
                    </Label>
                    <Input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                    />
                    {formErrors.stock && (
                      <Text className="mt-1 text-sm text-red-600">
                        {formErrors.stock}
                      </Text>
                    )}
                  </Field>
                  <Field>
                    <Label>
                      {translate.products("lowStockAlert")}
                    </Label>
                    <Input
                      type="number"
                      name="lowStockAlert"
                      value={formData.lowStockAlert || ""}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                    />
                  </Field>
                </div>

                {/* Active Status */}
                <Field>
                  <Checkbox
                    id="active"
                    name="active"
                    checked={formData.active}
                    onChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">
                    {translate.products("activeForSale")}
                  </Label>
                </Field>

                {/* Product Variants */}
                <Field>
                  <div className="flex items-center mb-2">
                    <Checkbox
                      id="hasVariants"
                      name="hasVariants"
                      checked={formData.hasVariants}
                      onChange={(checked) => setFormData(prev => ({ ...prev, hasVariants: checked }))}
                    />
                    <Label htmlFor="hasVariants">
                      {translate.products("hasVariants")}
                    </Label>
                  </div>

                  {formData.hasVariants && (
                    <div
                      className={`mt-3 border rounded-md p-3 ${
                        formErrors.variants ? "border-red-500" : "border-gray-200"
                      }`}
                    >
                      <Label className="block mb-2">
                        {translate.products("variants")}
                      </Label>
                      {formErrors.variants && (
                        <Text className="text-sm text-red-600 mb-2">
                          {formErrors.variants}
                        </Text>
                      )}
                      <div className="space-y-2 mb-2">
                        {(formData.variants || []).map((variant, index) => (
                          <div key={index} className="flex items-center">
                            <Input
                              type="text"
                              value={variant}
                              onChange={(e) => {
                                const newVariants = [
                                  ...(formData.variants || []),
                                ];
                                newVariants[index] = e.target.value;
                                setFormData({
                                  ...formData,
                                  variants: newVariants,
                                });
                              }}
                              className="flex-1"
                              placeholder={translate.products("selectVariant")}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newVariants = [
                                  ...(formData.variants || []),
                                ];
                                newVariants.splice(index, 1);
                                setFormData({
                                  ...formData,
                                  variants: newVariants,
                                });
                              }}
                              className="ml-2 p-2 text-red-500 hover:text-red-700"
                            >
                              <XIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <Button
                        outline
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            variants: [...(formData.variants || []), ""],
                          });
                        }}
                        className="mt-2"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        {translate.products("addVariant")}
                      </Button>
                    </div>
                  )}
                </Field>
              </div>
            </div>
          </Fieldset>
        </form>
        </DialogBody>
        <DialogActions>
          <Button
            onClick={handleSubmit}
            disabled={submitLoading}
            className="ml-3"
          >
            {currentProduct
              ? translate.common("save")
              : translate.common("add")}
          </Button>
          <Button
            outline
            onClick={() => setIsModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common("cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <DialogTitle>
          {translate.common("delete")}
        </DialogTitle>
        <DialogBody>
          <div className="py-4">
            <Text className="text-gray-600">
              {translate.categories("deleteConfirmation")}{" "}
              <span className="font-medium text-gray-900">
                {currentProduct?.name}
              </span>
            </Text>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            color="red"
            onClick={handleDelete}
            disabled={submitLoading}
            className="ml-3"
          >
            {translate.common("delete")}
          </Button>
          <Button
            outline
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={submitLoading}
          >
            {translate.common("cancel")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Products;

// Missing XIcon component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
