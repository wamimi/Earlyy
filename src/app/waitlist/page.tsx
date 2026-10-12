import { redirect } from "next/navigation";

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const { interest } = await searchParams;
  redirect(interest === "developer" ? "/developers/docs" : "/dashboard");
}
