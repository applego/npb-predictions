import { ImageResponse } from "next/og";
import { SEO_TERMS } from "@/lib/seo-meta";

export const runtime = "edge";
export const alt = "みんなの順位予想対決 — その予想、どこまで当たった？";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Reuse the bundled Japanese font; previews do not depend on an external CDN.
  const response = await fetch(new URL("./api/ranking-card/[type]/assets/noto-sans-jp-japanese-700-normal.woff", import.meta.url));
  if (!response.ok) throw new Error("Bundled share font unavailable");
  const data = await response.arrayBuffer();
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#142c2b", color: "#fff", padding: "48px 64px", fontFamily: "Noto", fontWeight: 700 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#dafa78" }}><span>{SEO_TERMS.site}</span><span>順位予想の答え合わせ</span></div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 64, fontSize: 72, lineHeight: 1.3, letterSpacing: -3 }}><span>その予想、</span><span style={{ color: "#dafa78" }}>どこまで当たった？</span></div>
      <div style={{ display: "flex", marginTop: 28, fontSize: 28, color: "#c5d2cc" }}>解説者の予想と実順位を、出典つきで比較。</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto", borderTop: "1px solid #597069", paddingTop: 24, fontSize: 22 }}><span>気になる結果を、仲間と答え合わせ。</span><span>npb-predictions.pages.dev</span></div>
    </div>,
    { ...size, fonts: [{ name: "Noto", data, weight: 700, style: "normal" }] },
  );
}
