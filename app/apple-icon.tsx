import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icons must be raster, so this renders the mark to a PNG. */
export default async function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#33291F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="112" height="112" viewBox="0 0 32 32">
        <path
          d="M12.6 7.4a3.4 3.4 0 0 1 6.8 0"
          fill="none"
          stroke="#F7F2E9"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <rect
          x="9.8"
          y="7.6"
          width="12.4"
          height="2.6"
          rx="1.1"
          fill="#F7F2E9"
        />
        <path
          d="M11.4 10.9h9.2l1.5 10.2a1 1 0 0 1-1 1.1H10.9a1 1 0 0 1-1-1.1z"
          fill="#F7F2E9"
        />
        <circle cx="16" cy="16" r="2.9" fill="#C2632E" />
        <rect
          x="9.4"
          y="22.6"
          width="13.2"
          height="2.6"
          rx="1.1"
          fill="#F7F2E9"
        />
      </svg>
    </div>,
    size,
  );
}
