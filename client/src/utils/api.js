const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const DEFAULT_ERROR_MESSAGE = "We couldn't complete that request. Please try again.";
const CONNECTION_ERROR_MESSAGE =
  "We couldn't reach the server. Please check your connection and try again.";

const buildApiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return null;
};

export const getApiErrorMessage = (error, fallback = DEFAULT_ERROR_MESSAGE) => {
  if (error?.isApiError && error.message) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return CONNECTION_ERROR_MESSAGE;
  }

  return fallback;
};

export const apiRequest = async (path, options = {}, fallbackErrorMessage) => {
  let response;

  try {
    response = await fetch(buildApiUrl(path), options);
  } catch (error) {
    throw Object.assign(new Error(getApiErrorMessage(error)), {
      isApiError: true,
      cause: error,
    });
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw Object.assign(
      new Error(data?.message || fallbackErrorMessage || DEFAULT_ERROR_MESSAGE),
      { isApiError: true, status: response.status, data }
    );
  }

  return data;
};
