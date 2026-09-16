import "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    // The configured service binding uses the standard Workers Fetcher type.
    // Keep this available in clean checkouts without generated local files.
    AKIHQ_GATEWAY: NonNullable<CloudflareEnv["ASSETS"]>;
  }
}
