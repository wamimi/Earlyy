import type { Metadata } from "next";
import { CampaignsExperience } from "@/components/campaigns-experience";
import "@/components/campaigns.css";

export const metadata: Metadata = {
  title: "Campaigns | Early",
  description: "Discover how your early support can unlock concert access, merchandise, and rewards from artists, brands, and communities.",
};

export default function CampaignsPage() {
  return <CampaignsExperience />;
}
