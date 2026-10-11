import type { Evaluation, Rule, RuleRoute } from "./model";

export type IntegrationCampaign = { id: string; definition: Rule };
export type VerificationSession = { sessionId: string; requestUrl: string; expiresAt: string; rewardReady: false };
export type VerificationStatus = { sessionId: string; status: "verified" | "expired" | "technical_failure" | "awaiting_proof"; errorCode: string | null; rewardReady: false };
export class EarlyClientError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}

/** Browser client for an authenticated user within the Early application origin. */
export function createEarlyClient(auth: { wallet: string; getAccessToken: () => Promise<string> }, transport: typeof fetch = fetch) {
  async function request<T>(operation: string, input: object, signal?: AbortSignal): Promise<T> {
    const token = await auth.getAccessToken();
    if (!token) throw new EarlyClientError("UNAUTHENTICATED", "Sign in to continue.", 401);
    const response = await transport(`/api/early/${operation}`, {
      method: "POST", credentials: "same-origin", cache: "no-store", signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, wallet: auth.wallet }),
    });
    let value;
    try { value = await response.json(); }
    catch { throw new EarlyClientError("INVALID_RESPONSE", "Early returned an unreadable response. Try again.", response.status); }
    if (!response.ok) throw new EarlyClientError(value.error?.code ?? "TECHNICAL_FAILURE", value.error?.message ?? "The request failed.", response.status);
    return value as T;
  }
  function consent(accepted: boolean) {
    if (accepted !== true) throw new EarlyClientError("CONSENT_REQUIRED", "Consent is required before checking support.", 400);
  }
  return {
    listCampaigns: (signal?: AbortSignal) => request<{ rules: IntegrationCampaign[] }>("list-rules", {}, signal),
    inspect: (ruleId: string, accepted: boolean, signal?: AbortSignal) => {
      consent(accepted);
      return request<{ evaluation: Evaluation }>("inspect", { ruleId, consent: true }, signal);
    },
    startVerification: (ruleId: string, selection: RuleRoute, accepted: boolean, signal?: AbortSignal) => {
      consent(accepted);
      return request<VerificationSession>("sessions", { ruleId, selection, consent: true }, signal);
    },
    verificationStatus: (ruleId: string, sessionId: string, signal?: AbortSignal) => request<VerificationStatus>("session-status", { ruleId, sessionId }, signal),
    evaluate: (ruleId: string, signal?: AbortSignal) => request<Evaluation>("evaluate", { ruleId }, signal),
  };
}
