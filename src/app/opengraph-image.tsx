import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Early — Your support has a history. Make it count.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [logo, atmosphere] = await Promise.all([
    readFile(join(process.cwd(), "public/branding/early-lockup.svg")),
    readFile(join(process.cwd(), "public/hero-culture-light.png")),
  ]);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "56px 68px", color: "#163d2e", background: "#f3f7ef", position: "relative" }}>
      {/* Native image elements are required by the image renderer. */}
      <img src={`data:image/png;base64,${atmosphere.toString("base64")}`} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0, opacity: .3 }} />
      <img src={`data:image/svg+xml;base64,${logo.toString("base64")}`} alt="Early" width={180} height={60} />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 54, fontSize: 78, fontWeight: 700, letterSpacing: "-3px", lineHeight: 1.08 }}><span>Your support</span><span>has a history.</span></div>
      <div style={{ display: "flex", marginTop: 22, fontSize: 30 }}>Make it count.</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}><span style={{ fontSize: 21 }}>Music. Culture. Recognition.</span><span style={{ padding: "16px 24px", borderRadius: 8, background: "#ff785f", fontSize: 22 }}>Open to everyone ↗</span></div>
    </div>, size,
  );
}
