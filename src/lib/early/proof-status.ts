export function proofStatusText(status: string) {
  switch (status) {
    case "verified": return "Support verified and saved privately. A campaign must accept this activity before it qualifies for a reward.";
    case "expired": return "This verification request expired. Start a fresh request; your support has not been ruled out.";
    case "technical_failure":
    case "failed": return "Verification could not finish. This is a technical failure, not a decision about your support. Start a fresh request after the issue is resolved.";
    default: return "Waiting for your proof. Complete verification in Reclaim Verifier; this page will update when it arrives.";
  }
}
