import type { Metadata } from "next";
import { DevelopersExperience } from "@/components/developers-experience";
import "@/components/developers.css";

export const metadata: Metadata = {
  title: "Developers | Early",
  description: "Build access and rewards around verified participation. Explore Early’s verification architecture, privacy boundaries, and open-source integration resources.",
};

export default function DevelopersPage() {
  return <DevelopersExperience />;
}
