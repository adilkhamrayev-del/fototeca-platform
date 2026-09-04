import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained .next/standalone build (only the
  // files actually needed at runtime, deps traced automatically) — this is
  // what gets copied onto the self-hosted Windows server and run directly
  // with `node .next/standalone/server.js` (see DEPLOY.md).
  //
  // Vercel does its OWN build packaging/tracing and does not expect this
  // format — with `output: "standalone"` set, Vercel's build step fails at
  // the final packaging stage (ENOENT on .next/next-server.js.nft.json),
  // even though `next build` itself succeeds. So this only applies when
  // we're NOT building on Vercel (no VERCEL env var there); Vercel gets its
  // default build output.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
