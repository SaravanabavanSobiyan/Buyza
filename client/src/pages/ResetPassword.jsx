import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { getErrorMessage, getFieldErrors } from "../api/axios";
import { validateReset } from "../utils/validators";
import useForm from "../hooks/useForm";
import AuthCard from "../components/AuthCard";
import FormField from "../components/FormField";
import PasswordStrength from "../components/PasswordStrength";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { values, errors, setErrors, handleChange, runValidation } = useForm(
    { password: "", confirmPassword: "" },
    validateReset
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!runValidation()) return;

    setLoading(true);
    try {
      const res = await resetPassword(token, values);
      navigate("/login", { replace: true, state: { message: res.message } });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert>{serverError}</Alert>
        <FormField label="New password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={handleChange} error={errors.password}>
          <PasswordStrength password={values.password} />
        </FormField>
        <FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword} />
        <Button type="submit" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">
          Need a new link?
        </Link>
      </p>
    </AuthCard>
  );
}
