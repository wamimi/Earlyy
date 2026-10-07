import type { Metadata } from "next";
import { BrandsExperience } from "@/components/brands-experience";
import "@/components/brands.css";

export const metadata: Metadata = {
  title: "Brands | Early",
  description: "Recognise the people behind your growth. Plan campaigns that turn verified early support into tickets, products, points, and rewards.",
};

export default function BrandsPage() {
  return <BrandsExperience />;
}
