import { RewardsWorkspace } from "@/components/rewards-workspace";
export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ session?: string; benefit?: string }> }) {
  const { session, benefit } = await searchParams;
  return <RewardsWorkspace initialBenefitId={benefit && /^[1-9]\d{0,77}$/.test(benefit) ? benefit : undefined} deployed={Boolean(process.env.NEXT_PUBLIC_MONAD_ESCROW_ADDRESS)} initialSessionId={session && /^[a-zA-Z0-9-]{1,200}$/.test(session) ? session : undefined} />;
}
