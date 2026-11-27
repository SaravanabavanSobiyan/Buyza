import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminBrands, createBrand, updateBrand, deleteBrand } from "../../api/admin";
import { getErrorMessage, getFieldErrors } from "../../api/axios";
import useForm from "../../hooks/useForm";
import Modal from "../../components/Modal";
import FormField from "../../components/FormField";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

function BrandModal({ brand, onClose, onSubmit }) {
  const { values, errors, setErrors, handleChange, runValidation } = useForm(
    { name: brand?.name || "", isActive: brand?.isActive ?? true },
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
      await onSubmit({ name: values.name.trim(), isActive: values.isActive });
      onClose();
    } catch (error) {
      setErrors(getFieldErrors(error));
      setServerError(getErrorMessage(error));
      setLoading(false);
    }
  };
  return (
    <Modal title={brand ? "Edit brand" : "Add brand"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <Alert>{serverError}</Alert>
        <FormField label="Name" name="name" value={values.name} onChange={handleChange} error={errors.name} />
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="isActive" checked={values.isActive} onChange={handleChange} />Active (shown in store filters)</label>
        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Save</Button></div>
      </form>
    </Modal>
  );
}

export default function Brands() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState("");
  const { data: brands = [], isLoading, isError, error } = useQuery({ queryKey: ["admin", "brands"], queryFn: getAdminBrands });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
  const saveMutation = useMutation({
    mutationFn: (payload) => (modal.brand ? updateBrand({ id: modal.brand._id, ...payload }) : createBrand(payload)),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({ mutationFn: deleteBrand, onSuccess: refresh, onError: (deleteError) => setActionError(getErrorMessage(deleteError)) });
  const handleDelete = (brand) => {
    setActionError("");
    if (window.confirm(`Delete "${brand.name}"?`)) deleteMutation.mutate(brand._id);
  };
  return (
    <div>
      <div className="flex items-center justify-between"><h2 className="text-lg font-medium">Brands</h2><Button onClick={() => setModal({ brand: null })}>Add brand</Button></div>
      <div className="mt-4 space-y-3">
        <Alert>{actionError}</Alert>
        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
        {isError && <Alert>{getErrorMessage(error)}</Alert>}
        {!isLoading && !isError && brands.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center"><p className="font-medium">No brands yet</p><p className="mt-1 text-sm text-gray-500">Add brands so customers can filter by them.</p></div>}
        {brands.length > 0 && <table className="w-full text-left text-sm"><thead className="border-b border-gray-200 text-gray-500"><tr><th className="py-2 pr-4 font-medium">Name</th><th className="py-2 pr-4 font-medium">Status</th><th className="py-2 font-medium">Actions</th></tr></thead><tbody>{brands.map((brand) => <tr key={brand._id} className="border-b border-gray-100"><td className="py-2 pr-4">{brand.name}</td><td className="py-2 pr-4"><span className={`rounded px-2 py-0.5 text-xs ${brand.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{brand.isActive ? "Active" : "Hidden"}</span></td><td className="space-x-3 py-2 text-xs"><button className="text-blue-600 hover:underline" onClick={() => setModal({ brand })}>Edit</button><button className="text-red-600 hover:underline" onClick={() => handleDelete(brand)}>Delete</button></td></tr>)}</tbody></table>}
      </div>
      {modal && <BrandModal brand={modal.brand} onClose={() => setModal(null)} onSubmit={(payload) => saveMutation.mutateAsync(payload)} />}
    </div>
  );
}
