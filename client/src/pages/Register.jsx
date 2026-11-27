import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { registerUser } from "../api/auth";
import { getErrorMessage, getFieldErrors } from "../api/axios";
import { setUser } from "../store/authSlice";
import completePendingCartAction from "../utils/completePendingCartAction";
import { validateRegister } from "../utils/validators";
import useForm from "../hooks/useForm";
import AuthCard from "../components/AuthCard";
import FormField from "../components/FormField";
import PasswordStrength from "../components/PasswordStrength";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { isGlobalApiFailure } from "../utils/showErrorToast";
import OAuthButtons from "../components/OAuthButtons";

export default function Register() {
  const { values, errors, setErrors, handleChange, runValidation } = useForm(
    { name: "", email: "", password: "", confirmPassword: "" },
    validateRegister
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!runValidation()) return;

    setLoading(true);
    try {
      const user = await registerUser({ ...values, name: values.name.trim(), email: values.email.trim() });
      dispatch(setUser(user));
      const pendingAction = location.state?.pendingCartAction;
      if (pendingAction) {
        try {
          const destination = await completePendingCartAction(dispatch, pendingAction);
          if (destination === "cart") {
            navigate(location.state?.from?.pathname || "/cart", { replace: true });
            return;
          }
          if (destination === "checkout") {
            navigate("/checkout", { replace: true });
            return;
          }
        } catch (error) {
          if (!isGlobalApiFailure(error)) {
            toast.error(
              `Account created, but the requested item could not be processed: ${typeof error === "string" ? error : "Please try again from the product page."}`
            );
          }
        }
      }
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Join Buyza and start shopping smarter.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Alert>{serverError}</Alert>
        <FormField label="Full name" name="name" autoComplete="name" value={values.name} onChange={handleChange} error={errors.name} />
        <FormField label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        >
          <PasswordStrength password={values.password} />
        </FormField>
        <FormField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
        <p className="mt-3 text-xs text-gray-500">
          By creating an account you agree to our{" "}
          <Link to="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of service</Link>{" "}
          and <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy policy</Link>.
        </p>
      </form>
      <OAuthButtons />
      <p className="mt-4 text-center text-sm text-gray-600">
        Already registered?{" "}
        <Link to="/login" state={location.state} className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
