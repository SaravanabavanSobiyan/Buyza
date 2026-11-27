import { useState } from "react";
import { getErrorMessage, getFieldErrors } from "../../api/axios";
import { validateAddress } from "../../utils/validators";
import useForm from "../../hooks/useForm";
import FormField from "../../components/FormField";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

const blank = {
  label: "",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Sri Lanka",
  isDefault: false,
};

// `address` = existing address when editing, null when adding
export default function AddressModal({ address, onClose, onSubmit }) {
  const { values, errors, setErrors, handleChange, runValidation } = useForm(
    address ? { ...blank, ...address } : blank,
    validateAddress
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!runValidation()) return;

    const { label, fullName, phone, line1, line2, city, province, postalCode, country, isDefault } = values;
    setLoading(true);
    try {
      await onSubmit({ label, fullName, phone, line1, line2, city, province, postalCode, country, isDefault });
      onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const field = (name, label, props = {}) => (
    <FormField label={label} name={name} value={values[name]} onChange={handleChange} error={errors[name]} {...props} />
  );

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-[#46382f]/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-medium">{address ? "Edit address" : "Add address"}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
          <Alert>{serverError}</Alert>
          {field("label", "Label (optional)", { placeholder: "Home, Office…" })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("fullName", "Full name", { autoComplete: "name" })}
            {field("phone", "Phone", { type: "tel", autoComplete: "tel" })}
          </div>
          {field("line1", "Address line 1", { autoComplete: "address-line1" })}
          {field("line2", "Address line 2 (optional)", { autoComplete: "address-line2" })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("city", "City", { autoComplete: "address-level2" })}
            {field("province", "Province (optional)")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
            {field("country", "Country")}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="isDefault" checked={values.isDefault} onChange={handleChange} disabled={address?.isDefault} />
            Set as default address
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save address
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
