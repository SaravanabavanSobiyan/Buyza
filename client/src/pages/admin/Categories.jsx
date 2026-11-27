import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from "../../api/admin";
import { getErrorMessage, getFieldErrors } from "../../api/axios";
import useForm from "../../hooks/useForm";
import Modal from "../../components/Modal";
import FormField, { inputClass } from "../../components/FormField";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

const toRows = (categories) =>
  categories
    .filter((category) => !category.parent)
    .flatMap((root) => [
      { ...root, depth: 0 },
      ...categories
        .filter((category) => String(category.parent) === String(root._id))
        .map((category) => ({ ...category, depth: 1 })),
    ]);

function CategoryModal({ category, parents, hasChildren, onClose, onSubmit }) {
  const { values, errors, setErrors, handleChange, runValidation } = useForm(
    {
      name: category?.name || "",
      parent: category?.parent || "",
      sortOrder: String(category?.sortOrder ?? 0),
      isActive: category?.isActive ?? true,
    },
    (value) => (value.name.trim().length < 2 ? { name: "Name must be at least 2 characters" } : {})
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!runValidation()) return;
    setLoading(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        parent: values.parent || null,
        sortOrder: Number(values.sortOrder),
        isActive: values.isActive,
      });
      onClose();
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error));
      setLoading(false);
    }
  };

  return (
    <Modal title={category ? "Edit category" : "Add category"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <Alert>{serverError}</Alert>
        <FormField label="Name" name="name" value={values.name} onChange={handleChange} error={errors.name} />
        <div>
          <label htmlFor="parent" className="mb-1 block text-sm font-medium text-gray-700">
            Parent category
          </label>
          <select
            id="parent"
            name="parent"
            value={values.parent}
            onChange={handleChange}
            disabled={hasChildren}
            className={inputClass()}
          >
            <option value="">None (top-level)</option>
            {parents.map((parent) => (
              <option key={parent._id} value={parent._id}>
                {parent.name}
              </option>
            ))}
          </select>
          {hasChildren && <p className="mt-1 text-xs text-gray-500">It has sub-categories, so it must stay top-level.</p>}
        </div>
        <FormField
          label="Sort order"
          name="sortOrder"
          type="number"
          min="0"
          value={values.sortOrder}
          onChange={handleChange}
          hint="Lower numbers show first."
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isActive" checked={values.isActive} onChange={handleChange} />
          Active (visible in the store)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState("");
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: getAdminCategories,
  });
  const rows = toRows(data);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
  const saveMutation = useMutation({
    mutationFn: (payload) => (modal.category ? updateCategory({ id: modal.category._id, ...payload }) : createCategory(payload)),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: refresh,
    onError: (deleteError) => setActionError(getErrorMessage(deleteError)),
  });
  const handleDelete = (category) => {
    setActionError("");
    if (window.confirm(`Delete "${category.name}"?`)) deleteMutation.mutate(category._id);
  };
  const editing = modal?.category;
  const parentOptions = data.filter((category) => !category.parent && category._id !== editing?._id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Categories</h2>
        <Button onClick={() => setModal({ category: null })}>Add category</Button>
      </div>
      <div className="mt-4 space-y-3">
        <Alert>{actionError}</Alert>
        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        {isError && <Alert>{getErrorMessage(error)}</Alert>}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="font-medium">No categories yet</p>
            <p className="mt-1 text-sm text-gray-500">Add your first category to organise products.</p>
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-gray-500">
                <tr><th className="py-2 pr-4 font-medium">Name</th><th className="py-2 pr-4 font-medium">Slug</th><th className="py-2 pr-4 font-medium">Products</th><th className="py-2 pr-4 font-medium">Status</th><th className="py-2 font-medium">Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((category) => (
                  <tr key={category._id} className="border-b border-gray-100">
                    <td className="py-2 pr-4" style={{ paddingLeft: category.depth * 20 }}>
                      {category.depth > 0 && <span className="mr-1 text-gray-400">└</span>}{category.name}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{category.slug}</td>
                    <td className="py-2 pr-4">{category.productCount}</td>
                    <td className="py-2 pr-4"><span className={`rounded px-2 py-0.5 text-xs ${category.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{category.isActive ? "Active" : "Hidden"}</span></td>
                    <td className="space-x-3 py-2 text-xs">
                      <button className="text-blue-600 hover:underline" onClick={() => setModal({ category })}>Edit</button>
                      <button className="text-red-600 hover:underline" onClick={() => handleDelete(category)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && (
        <CategoryModal
          category={editing}
          parents={parentOptions}
          hasChildren={Boolean(editing && data.some((category) => String(category.parent) === String(editing._id)))}
          onClose={() => setModal(null)}
          onSubmit={(payload) => saveMutation.mutateAsync(payload)}
        />
      )}
    </div>
  );
}
