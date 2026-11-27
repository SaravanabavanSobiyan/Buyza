import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { loginUser, logoutUser } from "../api/auth";
import { getErrorMessage } from "../api/axios";
import { setUser } from "../store/authSlice";
import completePendingCartAction from "../utils/completePendingCartAction";
import { validateLogin } from "../utils/validators";
import useForm from "../hooks/useForm";
import AuthCard from "../components/AuthCard";
import FormField from "../components/FormField";
import Button from "../components/Button";
import Alert from "../components/Alert";
import OAuthButtons from "../components/OAuthButtons";
import { isGlobalApiFailure } from "../utils/showErrorToast";

export default function Login({ adminOnly = false }) {
  const { values, errors, handleChange, runValidation } = useForm(
    { email: "", password: "", rememberMe: false },
    validateLogin
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!runValidation()) return;

    setLoading(true);
    try {
      const user = await loginUser({ ...values, email: values.email.trim() });
      if (adminOnly && !["staff", "manager", "admin"].includes(user.role)) {
        await logoutUser();
        setServerError("This portal is for store team members only.");
        return;
      }
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
              `Signed in, but the requested item could not be processed: ${typeof error === "string" ? error : "Please try again from the product page."}`
            );
          }
          navigate(location.state?.from?.pathname || "/", { replace: true });
          return;
        }
      }
      // go back to the page the visitor wanted before being asked to log in
      const returnTo = location.state?.from;
      navigate(
        returnTo
          ? { pathname: returnTo.pathname, search: returnTo.search, hash: returnTo.hash }
          : adminOnly
            ? "/admin"
            : "/",
        { replace: true }
      );
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={adminOnly ? "Admin sign in" : "Sign in"}
      subtitle={adminOnly ? "Manage your Buyza storefront from one secure workspace." : undefined}
      adminOnly={adminOnly}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {searchParams.get("suspended") && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Your account has been suspended. Please{" "}
            <Link to="/contact" className="font-medium underline">contact us</Link>.
          </div>
        )}
        <Alert type="success">{location.state?.message}</Alert>
        <Alert>{serverError}</Alert>
        <FormField label="Email address" name="email" type="email" placeholder="Enter your email" autoComplete="email" value={values.email} onChange={handleChange} error={errors.email} />
        <FormField label="Password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" value={values.password} onChange={handleChange} error={errors.password} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" name="rememberMe" checked={values.rememberMe} onChange={handleChange} />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading} className={`w-full ${adminOnly ? "buyza-admin-submit" : ""}`}>
          {adminOnly ? "Enter admin portal" : "Sign In"}
        </Button>
      </form>
      {!adminOnly && <OAuthButtons />}
      <p className="mt-4 text-center text-sm text-gray-600">
        {adminOnly ? (
          <Link to="/login" className="text-blue-600 hover:underline">Customer sign in</Link>
        ) : (
          <>
            New to Buyza{" "}
            <Link to="/register" state={location.state} className="text-blue-600 hover:underline">
              Create account
            </Link>
          </>
        )}
      </p>
    </AuthCard>
  );
}
