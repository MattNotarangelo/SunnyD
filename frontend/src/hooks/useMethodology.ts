import { useEffect, useState } from "react";
import { fetchMethodology } from "../api/methodology";
import type { MethodologyResponse } from "../types";

export function useMethodology() {
  const [data, setData] = useState<MethodologyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMethodology()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return { methodology: data, error };
}
