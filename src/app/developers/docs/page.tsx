import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LandingFooter } from "@/components/landing-footer";
import "@/components/developers.css";
export default function DeveloperReference() {
  return <main className="product-main developers-page"><SiteHeader /><section className="dv-container dv-reference-heading"><h1>Documentation<br />is coming soon.</h1><p>We’re building the integration guides and APIs for Early. Join the developer waitlist to hear when access opens.</p><Link className="dv-button dv-green" href="/waitlist?interest=developer">Join the developer waitlist</Link></section><LandingFooter compact /></main>;
}
