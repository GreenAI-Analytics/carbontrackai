import { config } from "../config.js";

export async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.externalTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.externalTimeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "text/plain, application/xml, text/xml",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      return { ok: false, status: response.status, data: "" };
    }

    const data = await response.text();
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: "" };
  } finally {
    clearTimeout(timeout);
  }
}
