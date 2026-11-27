import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { refreshSession } from "../api/axios";
import { setUser } from "../store/authSlice";

export default function OAuthCallback() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const error = new URLSearchParams(location.search).get("error");
  const [message, setMessage] = useState("Finishing sign in...");

  useEffect(() => {
    if (error) {
      return;
    }
    refreshSession()
      .then(({ user }) => {
        dispatch(setUser(user));
        navigate("/", { replace: true });
      })
      .catch(() => setMessage("Social sign in failed. Please try again."));
  }, [dispatch, error, navigate]);

  const displayMessage = error === "cancelled" ? "Sign in was cancelled." : error || message;
  return <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] p-6 text-sm text-gray-600">{displayMessage}</main>;
}
