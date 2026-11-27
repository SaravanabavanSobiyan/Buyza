import toast from "react-hot-toast";
import { OFFLINE_MESSAGE, SERVER_MESSAGE, TIMEOUT_MESSAGE } from "../api/normalizeError";

const GLOBAL_ERROR_MESSAGES = new Set([OFFLINE_MESSAGE, SERVER_MESSAGE, TIMEOUT_MESSAGE]);

export const isGlobalApiFailure = (error) => {
  const status = error?.response?.status;
  const message =
    typeof error === "string"
      ? error
      : error?.response?.data?.message || error?.message;
  return status === 0 || status >= 500 || GLOBAL_ERROR_MESSAGES.has(message);
};

export const showErrorToast = (error, fallback, options) => {
  if (isGlobalApiFailure(error)) return;
  const message =
    typeof error === "string"
      ? error
      : error?.response?.data?.message || error?.message || fallback;
  toast.error(message || fallback, options);
};
