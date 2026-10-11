export function proofFailure(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  switch (name) {
    case "ProofNotValidatedError":
    case "UnknownProofsNotValidatedError":
      return { code: "INVALID_PROOF_RECIPE", message: "The proof does not match the approved activity recipe.", status: 400 };
    case "ProofNotVerifiedError":
    case "InvalidSignatureError":
    case "SignatureNotFoundError":
      return { code: "INVALID_PROOF_SIGNATURE", message: "The proof signature could not be verified against a trusted attestor.", status: 400 };
    case "TeeVerificationError":
    case "AttestorTeeVerificationError":
      return { code: "INVALID_PROOF_ATTESTATION", message: "The proof's required attestation could not be verified.", status: 400 };
    case "BackendServerError":
    case "ProviderConfigFetchError":
      return { code: "PROOF_VERIFICATION_UNAVAILABLE", message: "The proof verification service is unavailable. Your support has not been ruled out.", status: 503 };
    default:
      return { code: "INVALID_PROOF", message: "Signature, attestor or exact recipe verification failed.", status: 400 };
  }
}
