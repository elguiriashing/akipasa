import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const business = hostname === "business.akipasa.com";
  const stay = hostname === "akiduermo.akipasa.com";
  const background = business ? "#192B48" : stay ? "#143C43" : "#14213D";
  const pin = business ? "#FFD447" : stay ? "#35C6A6" : "#F26B1D";
  const sparkle = business ? "#F26B1D" : stay ? "#B3F4CD" : "#FFBE2E";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="23" fill="${background}"/><g transform="translate(23 14) scale(.8)"><path fill="${pin}" fill-rule="evenodd" d="M27 6C13.2 6 2 17.2 2 31c0 17 25 43 25 43s25-26 25-43C52 17.2 40.8 6 27 6Zm0 15a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z"/><path fill="${sparkle}" d="m53 0 3.2 9.8L64 13l-7.8 3.2L53 26l-3.2-9.8L42 13l7.8-3.2Z"/></g></svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
