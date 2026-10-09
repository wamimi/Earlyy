import { FanDashboard } from "@/components/fan-dashboard/fan-dashboard";
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  return <FanDashboard campaignId={(await params).id} />;
}
