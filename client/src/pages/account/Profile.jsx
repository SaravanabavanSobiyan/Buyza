import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateProfile, uploadAvatar } from "../../api/account";
import { getErrorMessage, getFieldErrors } from "../../api/axios";
import { setUser } from "../../store/authSlice";
import { validateProfile } from "../../utils/validators";
import useForm from "../../hooks/useForm";
import Avatar from "../../components/Avatar";
import FormField from "../../components/FormField";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

const MAX_SIZE = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function Profile() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const fileInput = useRef(null);

  const { values, errors, setErrors, handleChange, runValidation } = useForm(
    { name: user.name, phone: user.phone || "" },
    validateProfile
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const handleFile = (e) => {
    const chosen = e.target.files?.[0];
    setAvatarError("");
    if (!chosen) return;
    if (!TYPES.includes(chosen.type)) return setAvatarError("Only JPG, PNG or WebP images are allowed");
    if (chosen.size > MAX_SIZE) return setAvatarError("Image must be 2 MB or smaller");
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
  };

  const handleUpload = async () => {
    setUploading(true);
    setAvatarError("");
    try {
      const updated = await uploadAvatar(file);
      dispatch(setUser(updated));
      setFile(null);
      setPreview("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setAvatarError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!runValidation()) return;

    setSaving(true);
    try {
      const updated = await updateProfile({ name: values.name.trim(), phone: values.phone.trim() });
      dispatch(setUser(updated));
      setMessage("Profile saved");
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium">Profile</h2>

      <div className="mt-4 flex items-center gap-4">
        <Avatar user={user} src={preview} size={72} />
        <div className="space-y-2">
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="block text-sm" />
          {file && (
            <Button type="button" onClick={handleUpload} loading={uploading}>
              Upload photo
            </Button>
          )}
          <p className="text-xs text-gray-500">JPG, PNG or WebP, up to 2 MB.</p>
        </div>
      </div>
      <div className="mt-3">
        <Alert>{avatarError}</Alert>
      </div>

      <form onSubmit={handleSave} className="mt-6 max-w-md space-y-4" noValidate>
        <Alert type="success">{message}</Alert>
        <Alert>{error}</Alert>
        <FormField label="Full name" name="name" value={values.name} onChange={handleChange} error={errors.name} />
        <FormField label="Phone" name="phone" type="tel" placeholder="+94 77 123 4567" value={values.phone} onChange={handleChange} error={errors.phone} />
        <FormField label="Email" name="email" value={user.email} readOnly disabled hint="Email can't be changed." />
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
