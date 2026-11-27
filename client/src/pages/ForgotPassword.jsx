import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import { getErrorMessage } from "../api/axios";
import { validateForgot } from "../utils/validators";
import useForm from "../hooks/useForm";
import AuthCard from "../components/AuthCard";
import FormField from "../components/FormField";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function ForgotPassword() {
  const { values, errors, handleChange, runValidation } = useForm({ email: "" }, validateForgot);
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setMessage("");
    if (!runValidation()) return;

    setLoading(true);
    try {
      const res = await forgotPassword(values.email.trim());
      setMessage(res.message);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a secure reset link.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert type="success">{message}</Alert>
        <Alert>{serverError}</Alert>
        <FormField label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
        <Button type="submit" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-blue-600 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
