import axios from "axios";

export const OFFLINE_MESSAGE =
  "You appear to be offline. Please check your connection and try again.";
export const TIMEOUT_MESSAGE = "The request took too long. Please try again.";
export const SERVER_MESSAGE =
  "Something went wrong on our side. Please try again in a moment.";

export const normalizeAxiosError = (error) => {
  if (!error || axios.isCancel(error)) return error;

  if (!error.response) {
    const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    error.response = {
      status: 0,
      data: {
        success: false,
        message: timedOut ? TIMEOUT_MESSAGE : OFFLINE_MESSAGE,
      },
      synthetic: true,
    };
    return error;
  }

  if (error.response.status >= 500) {
    const data = error.response.data;
    error.response.data = {
      ...(data && typeof data === "object" ? data : {}),
      message: SERVER_MESSAGE,
    };
  }
  return error;
};
