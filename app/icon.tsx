import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Biểu tượng app: chữ L trắng trên nền màu thương hiệu, có lề đủ rộng để dùng làm icon dạng maskable.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
          color: "#ffffff",
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
