import type { MetadataRoute } from "next";

// Cho phép cài app lên màn hình chính của điện thoại và mở toàn màn hình.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LisB",
    short_name: "LisB",
    description: "Học ngoại ngữ, mỗi lần hai phút",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#059669",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
