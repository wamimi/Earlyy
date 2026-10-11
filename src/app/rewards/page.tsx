import { RewardsWorkspace } from "@/components/rewards-workspace";
import { routeIds, type RouteId } from "@/lib/early/model";
export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ session?: string; benefit?: string; activity?: string }> }) {
  const { session, benefit, activity } = await searchParams;
  const initialActivity = routeIds.includes(activity as RouteId) ? activity as RouteId : undefined;
  return <RewardsWorkspace initialActivity={initialActivity} initialBenefitId={benefit && /^[1-9]\d{0,77}$/.test(benefit) ? benefit : undefined} deployed={Boolean(process.env.NEXT_PUBLIC_MONAD_ESCROW_ADDRESS)} initialSessionId={session && /^[a-zA-Z0-9-]{1,200}$/.test(session) ? session : undefined} />;
}
