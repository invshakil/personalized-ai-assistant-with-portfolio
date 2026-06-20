import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Open Graph / social-share card metadata
export const alt = "Syful Islam Shakil — Tech Lead & Full-Stack Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Portfolio brand tokens (mirrors globals.css — portfolio surface)
const FOREST = "#1a3a2a";
const FOREST_LIGHT = "#2d5a3d";
const LINEN = "#f5f0e8";
const SAGE = "#8faa8b";

export default async function Image() {
  // process.cwd() is the Next.js project root; the photo lives in /public.
  const photo = await readFile(join(process.cwd(), "public", "shakil-profile.jpg"));
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "80px 90px",
        background: `linear-gradient(135deg, ${FOREST} 0%, ${FOREST_LIGHT} 100%)`,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: SAGE,
            marginBottom: 24,
          }}
        >
          sshakil.com
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: LINEN,
            lineHeight: 1.05,
            marginBottom: 28,
          }}
        >
          Syful Islam Shakil
        </div>
        <div style={{ fontSize: 36, color: "#cfe0cf", lineHeight: 1.3 }}>
          Tech Lead &amp; Full-Stack Engineer
        </div>
        <div style={{ fontSize: 26, color: SAGE, marginTop: 18 }}>
          10+ years · React · Next.js · Node · AI
        </div>
      </div>
      <img
        src={photoSrc}
        width={340}
        height={340}
        style={{
          borderRadius: "50%",
          border: `8px solid ${SAGE}`,
          objectFit: "cover",
        }}
      />
    </div>,
    { ...size }
  );
}
