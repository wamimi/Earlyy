import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { LandingFooter } from "@/components/landing-footer";
import { WaitlistForm } from "@/components/waitlist-form";
import "./waitlist.css";
export const metadata: Metadata = { title: "Join the waitlist | Early", description: "Be first to hear when Early opens for fans, creators, brands, and developers." };
export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const { interest } = await searchParams;
  return <main className="waitlist-page"><SiteHeader /><section className="wl-layout"><div className="wl-copy"><span>Be here at the beginning.</span><h1>Your support.<br />Something more.</h1><p>Proof you were there. Recognition that lasts. Access and rewards from the people you support.</p><p>Early is in active development. Join the waitlist for launch and early access updates.</p></div><div className="wl-panel"><WaitlistForm initialInterest={interest} /></div></section><LandingFooter compact /></main>;
}
