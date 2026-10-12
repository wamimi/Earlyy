import { evaluate, type Evidence, type Evaluation, type Rule, type RuleRoute } from "./model";

export type Inspection =
  | { status: "candidates"; candidates: { id: string; label: string }[] }
  | { status: "no_candidate" | "unsupported" | "technical_failure"; reason: string };
export interface ActivityAdapter {
  inspect(route: RuleRoute): Promise<Inspection>;
  prove(route: RuleRoute, candidateId: string): Promise<Evidence>;
}

/** Call only after consent; selection remains an explicit user decision. */
export async function inspectAlternatives(rule: Rule, adapter: ActivityAdapter,
  choose: (route: RuleRoute, candidates: { id: string; label: string }[]) => Promise<string | null>,
  existing: Evidence[] = [], broaderRecord = false): Promise<{ evaluation: Evaluation; evidence: Evidence[]; inspections: Inspection[] }> {
  const evidence = [...existing], inspections: Inspection[] = [];
  for (const route of rule.alternatives) {
    if (!broaderRecord && evaluate(rule, evidence).status === "eligible") break;
    let inspection: Inspection;
    try { inspection = await adapter.inspect(route); }
    catch { inspection = { status: "technical_failure", reason: "Source inspection failed. Retry this route." }; }
    inspections.push(inspection);
    if (inspection.status !== "candidates") continue;
    const selected = await choose(route, inspection.candidates);
    if (!selected || !inspection.candidates.some(c => c.id === selected)) continue;
    try { evidence.push(await adapter.prove(route, selected)); }
    catch { inspections.push({ status: "technical_failure", reason: "Proof verification failed. Retry this route." }); }
  }
  let evaluation = evaluate(rule, evidence);
  if (evaluation.status !== "eligible" && inspections.some(i => i.status === "technical_failure"))
    evaluation = { status: "technical_failure", evidenceIds: [], reason: "An accepted route could not be checked; this is not an eligibility decision." };
  return { evaluation, evidence, inspections };
}
