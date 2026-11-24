"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/lib/apiResponse";

export function useApiData<T>(url: string | null) {
  const [attempt, setAttempt] = useState(0); // bumped by retry()
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string | null;
  } | null>(null);

  const key = `${url}|${attempt}`;
  const loading = url !== null && result?.key !== key;

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const requestKey = `${url}|${attempt}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiResponse<T>>)
      .then((body) => {
        setResult(
          body.success
            ? { key: requestKey, data: body.data, error: null }
            : { key: requestKey, data: null, error: body.error.message },
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return; // a newer request replaced this one
        setResult({
          key: requestKey,
          data: null,
          error: "Could not reach the server. Please try again.",
        });
      });

    return () => controller.abort();
  }, [url, attempt]);

  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading,
    retry: () => setAttempt((n) => n + 1),
  };
}
