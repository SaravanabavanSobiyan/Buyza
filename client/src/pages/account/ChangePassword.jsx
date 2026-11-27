import { useState } from "react";
import { changePassword } from "../../api/account";
import { getErrorMessage, getFieldErrors } from "../../api/axios";
import { validateChangePassword } from "../../utils/validators";
import useForm from "../../hooks/useForm";
import FormField from "../../components/FormField";
import PasswordStrength from "../../components/PasswordStrength";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

const empty = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function ChangePassword() {
  const { values, setValues, errors, setErrors, handleChange, runValidation } = useForm(empty, validateChangePassword);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!runValidation()) return;

    setLoading(true);
    try {
      await changePassword(values);
      setMessage("Password changed");
      setValues(empty);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium">Change password</h2>
      <form onSubmit={handleSubmit} className="mt-4 max-w-md space-y-4" noValidate>
        <Alert type="success">{message}</Alert>
        <Alert>{error}</Alert>
        <FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" value={values.currentPassword} onChange={handleChange} error={errors.currentPassword} />
        <FormField label="New password" name="newPassword" type="password" autoComplete="new-password" value={values.newPassword} onChange={handleChange} error={errors.newPassword}>
          <PasswordStrength password={values.newPassword} />
        </FormField>
        <FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
        <Button type="submit" loading={loading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
