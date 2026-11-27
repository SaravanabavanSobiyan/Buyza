import axios from "axios";
import { describe, expect, test } from "vitest";
import {
  normalizeAxiosError,
  OFFLINE_MESSAGE,
  TIMEOUT_MESSAGE,
  SERVER_MESSAGE,
} from "./normalizeError";

const withResponse = (status, data) =>
  Object.assign(new Error(`Request failed with ${status}`), {
    response: { status, data },
  });

describe("normalizeAxiosError", () => {
  test("turns network errors into offline messages", () => {
    const error = normalizeAxiosError(new Error("Network Error"));
    expect(error.response.status).toBe(0);
    expect(error.response.data.message).toBe(OFFLINE_MESSAGE);
  });

  test("gives timeout errors their own message", () => {
    const error = normalizeAxiosError(
      Object.assign(new Error("timeout"), { code: "ECONNABORTED" }),
    );
    expect(error.response.data.message).toBe(TIMEOUT_MESSAGE);
  });

  test("replaces server error bodies with a friendly message", () => {
    const error = normalizeAxiosError(
      withResponse(500, { success: false, message: "MongoServerError: E11000" }),
    );
    expect(error.response.data).toEqual({
      success: false,
      message: SERVER_MESSAGE,
    });
  });

  test("normalizes 502 HTML bodies", () => {
    expect(normalizeAxiosError(withResponse(502, "<html>Bad Gateway</html>")).response.data)
      .toEqual({ message: SERVER_MESSAGE });
  });

  test("leaves client errors unchanged", () => {
    const error = normalizeAxiosError(
      withResponse(409, { success: false, message: "Only 3 left in stock" }),
    );
    expect(error.response.data.message).toBe("Only 3 left in stock");
  });

  test("does not touch cancelled requests", () => {
    const cancelled = new axios.CanceledError("canceled");
    expect(normalizeAxiosError(cancelled)).toBe(cancelled);
  });
});
