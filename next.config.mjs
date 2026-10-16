/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@libsql/client", "bcryptjs"],
  // The GQ article links to ratios-calculator.ascendbase.pro — keep that
  // link alive by sending every request on that host to the live /ratios app.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ratios-calculator.ascendbase.pro" }],
        destination: "https://www.ascendbase.pro/ratios",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
