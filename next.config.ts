import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only Next.js indicator: keep it out of the sidebar's bottom-left "Sign out" area.
  devIndicators: { position: "bottom-right" },
  // pdfkit reads its font metric files from disk at runtime, so it must not be bundled.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
