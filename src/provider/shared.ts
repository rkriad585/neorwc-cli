import { getModelsByProvider } from "modelpedia";

export function defaultContext(providerName: string, fallback: number): number {
  try {
    const models = getModelsByProvider(providerName);
    const withCtx = models.find((m) => m.context_window);
    if (withCtx?.context_window) return withCtx.context_window;
  } catch {}
  return fallback;
}

export function findModelContext(providerName: string, modelName: string): number | undefined {
  const models = getModelsByProvider(providerName);
  const lowerInput = modelName.toLowerCase();
  const exact = models.find((m) => m.id.toLowerCase() === lowerInput);
  if (exact?.context_window) return exact.context_window;
  const prefix = models.find((m) => m.id.toLowerCase().startsWith(lowerInput));
  return prefix?.context_window ?? undefined;
}

const DEFAULT_TIMEOUT = 120_000;

export function fetchWithTimeout(url: string | URL, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOpts } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const existingSignal = fetchOpts.signal;
  if (existingSignal) {
    existingSignal.addEventListener("abort", () => controller.abort());
  }
  fetchOpts.signal = controller.signal;
  const cleanup = () => clearTimeout(id);
  return fetch(url, fetchOpts).then(
    (res) => { cleanup(); return res; },
    (err) => { cleanup(); throw err; }
  );
}
