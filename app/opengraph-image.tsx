import { ImageResponse } from "next/og";
import {
  BOROUGHS,
  BOROUGH_COLORS,
  OFFICE_COLORS,
  SITES,
  countByBorough,
} from "@/lib/sites";

export const alt =
  "Lantern Maps — internal map of Lantern Community Services housing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Rendered to a PNG at build time by Next's own renderer. No external image
 * service, no network fetch, no key.
 */
export default async function Image() {
  const counts = countByBorough(SITES);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#F7F2E9",
        padding: "72px 80px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Warm corner wash, echoing the map's paper palette. */}
      <div
        style={{
          position: "absolute",
          top: -180,
          right: -140,
          width: 620,
          height: 620,
          borderRadius: 620,
          background: "#F4E2D5",
          opacity: 0.75,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 11,
              background: "#33291F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 15,
                height: 15,
                borderRadius: 15,
                background: "#C2632E",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 21,
              letterSpacing: 3.4,
              color: "#9A8F82",
              textTransform: "uppercase",
            }}
          >
            Lantern Community Services
          </div>
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 118,
            lineHeight: 1.02,
            color: "#33291F",
            letterSpacing: -3,
            display: "flex",
          }}
        >
          Lantern Maps
        </div>

        <div
          style={{
            marginTop: 22,
            fontSize: 33,
            color: "#6B5F52",
            display: "flex",
          }}
        >
          {SITES.length} supportive-housing sites across New York City
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        {BOROUGHS.map((borough) => (
          <div
            key={borough}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 18,
                background: BOROUGH_COLORS[borough].base,
              }}
            />
            <div style={{ fontSize: 26, color: "#33291F" }}>{borough}</div>
            <div style={{ fontSize: 26, color: "#9A8F82" }}>
              {String(counts[borough]).padStart(2, "0")}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: OFFICE_COLORS.base,
            }}
          />
          <div style={{ fontSize: 26, color: "#33291F" }}>Admin</div>
        </div>
      </div>
    </div>,
    size,
  );
}
