import toast from "react-hot-toast";
import { SERVER_MESSAGE } from "./normalizeError";

export const notifyApiFailure = (error) => {
  if (error?.response?.synthetic) {
    toast.error(error.response.data.message, { id: "api-offline-error" });
    return;
  }
  if (error?.response?.status >= 500) {
    toast.error(SERVER_MESSAGE, { id: "api-server-error" });
  }
};
