import { useState } from "react";
import { PROVINCES } from "../../utils/provinces";

const EMPTY_ADDRESS = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postalCode: "",
};

const validate = (address, email, needEmail) => {
  const errors = {};
  if (address.fullName.trim().length < 2) errors.fullName = "Enter your full name";
  if (!/^(?:\+94|94|0)\d{9}$/.test(address.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Enter a valid Sri Lankan phone number, e.g. 0771234567";
  }
  if (address.line1.trim().length < 3) errors.line1 = "Enter your street address";
  if (!address.city.trim()) errors.city = "Enter your city";
  if (!PROVINCES.includes(address.province)) errors.province = "Select a province";
  if (!/^\d{5}$/.test(address.postalCode.trim())) errors.postalCode = "Postal code must be 5 digits";
  if (needEmail && !/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address";
  return errors;
};

const inputClass = (hasError = false) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#46382f] outline-none transition placeholder:text-[#aaa197] focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/15 ${
    hasError ? "border-red-400" : "border-[#e8e1d7]"
  }`;

function Field({ label, error, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-[#46382f]">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export default function AddressForm({
  initial,
  initialAddressId = "",
  initialEmail = "",
  needEmail = false,
  savedAddresses = [],
  savedAddressesError = "",
  submitting = false,
  onChange,
  onSubmit,
}) {
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS, ...initial });
  const [email, setEmail] = useState(initialEmail);
  const [addressId, setAddressId] = useState(initialAddressId);
  const [errors, setErrors] = useState({});
  const defaultAddress = savedAddresses.find((saved) => saved.isDefault) || savedAddresses[0];

  const updateField = (field) => (event) => {
    setAddress((current) => ({ ...current, [field]: event.target.value }));
    setAddressId("");
    onChange?.();
  };

  const applySavedAddress = (saved) => {
    setAddress({
      fullName: saved.fullName || "",
      phone: saved.phone || "",
      line1: saved.line1 || "",
      line2: saved.line2 || "",
      city: saved.city || "",
      province: saved.province || "",
      postalCode: saved.postalCode || "",
    });
    setAddressId(saved._id);
    onChange?.();
  };

  const selectSavedAddress = (event) => {
    const saved = savedAddresses.find((item) => item._id === event.target.value);
    if (!saved) {
      setAddressId("");
      onChange?.();
      return;
    }

    applySavedAddress(saved);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(address, email, needEmail);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const cleanAddress = Object.fromEntries(
      Object.entries({ ...address, country: "Sri Lanka" }).map(([key, value]) => [
        key,
        value.trim(),
      ])
    );
    cleanAddress.phone = cleanAddress.phone.replace(/[\s-]/g, "");
    onSubmit({
      address: cleanAddress,
      addressId: addressId || null,
      email: email.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {savedAddresses.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-[#e8e1d7] bg-[#faf7f2] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#9a7946]">
              Saved
            </span>
            <div>
              <p className="font-semibold text-[#46382f]">Use a saved address</p>
              <p className="mt-1 text-sm leading-6 text-[#6b665f]">
              {defaultAddress.fullName} · {defaultAddress.line1}
              {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}, {defaultAddress.city}
              {defaultAddress.province ? `, ${defaultAddress.province}` : ""}
              </p>
              <p className="text-sm text-[#6b665f]">{defaultAddress.phone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => applySavedAddress(defaultAddress)}
            className="min-h-11 rounded-xl border border-[#c9a96e] bg-white px-4 py-2.5 text-sm font-semibold text-[#46382f] transition hover:bg-[#f5efe5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946]"
          >
            {addressId === defaultAddress._id ? "Using this address" : "Deliver to this address"}
          </button>
          {savedAddresses.length > 1 && (
            <Field label="Or choose another saved address">
              <select
                onChange={selectSavedAddress}
                value={addressId}
                className={inputClass()}
                aria-label="Choose another saved address"
              >
                <option value="">Enter a different address</option>
                {savedAddresses.map((saved) => (
                  <option key={saved._id} value={saved._id}>
                    {saved.fullName}, {saved.line1}, {saved.city}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      )}
      {savedAddressesError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Saved addresses could not be loaded: {savedAddressesError}
        </p>
      )}

      {needEmail && (
        <Field label="Email (for order updates)" error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              onChange?.();
            }}
            autoComplete="email"
            className={inputClass(errors.email)}
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}>
          <input
            value={address.fullName}
            onChange={updateField("fullName")}
            autoComplete="name"
            className={inputClass(errors.fullName)}
          />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input
            value={address.phone}
            onChange={updateField("phone")}
            autoComplete="tel"
            inputMode="tel"
            className={inputClass(errors.phone)}
          />
        </Field>
      </div>

      <Field label="Street address" error={errors.line1}>
        <input
          value={address.line1}
          onChange={updateField("line1")}
          autoComplete="address-line1"
          className={inputClass(errors.line1)}
        />
      </Field>
      <Field label="Address line 2 (optional)">
        <input
          value={address.line2}
          onChange={updateField("line2")}
          autoComplete="address-line2"
          className={inputClass()}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" error={errors.city}>
          <input
            value={address.city}
            onChange={updateField("city")}
            autoComplete="address-level2"
            className={inputClass(errors.city)}
          />
        </Field>
        <Field label="Province" error={errors.province}>
          <select
            value={address.province}
            onChange={updateField("province")}
            className={inputClass(errors.province)}
          >
            <option value="">Select...</option>
            {PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province.replace(" Province", "")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Postal code" error={errors.postalCode}>
          <input
            value={address.postalCode}
            onChange={updateField("postalCode")}
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            className={inputClass(errors.postalCode)}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="min-h-11 w-full rounded-xl bg-[#46382f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#332920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7946] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Checking delivery options..." : "Continue to delivery"}
      </button>
    </form>
  );
}
