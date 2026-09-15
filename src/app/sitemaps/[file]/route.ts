import { sitemapFile } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  return sitemapFile((await params).file);
}
