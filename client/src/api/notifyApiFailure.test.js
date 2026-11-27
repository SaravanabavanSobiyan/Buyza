import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn() },
}));

import toast from "react-hot-toast";
import { notifyApiFailure } from "./notifyApiFailure";
import { SERVER_MESSAGE } from "./normalizeError";
import { showErrorToast } from "../utils/showErrorToast";

beforeEach(() => vi.clearAllMocks());

describe("notifyApiFailure", () => {
  test("uses a stable toast id for offline requests", () => {
    const error = {
      response: {
        synthetic: true,
        data: { message: "You appear to be offline." },
      },
    };

    notifyApiFailure(error);
    notifyApiFailure(error);

    expect(toast.error).toHaveBeenLastCalledWith("You appear to be offline.", {
      id: "api-offline-error",
    });
    expect(toast.error).toHaveBeenCalledTimes(2);
  });

  test("uses one stable toast id for server failures and suppresses local duplicates", () => {
    const error = {
      response: { status: 503, data: { message: SERVER_MESSAGE } },
    };

    notifyApiFailure(error);
    showErrorToast(error, "Request failed");

    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith(SERVER_MESSAGE, {
      id: "api-server-error",
    });
  });

  test("still shows ordinary client-side API errors locally", () => {
    showErrorToast({ response: { status: 409, data: { message: "Conflict" } } }, "Failed");
    expect(toast.error).toHaveBeenCalledWith("Conflict", undefined);
  });
});
