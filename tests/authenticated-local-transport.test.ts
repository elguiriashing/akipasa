import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { describe, expect, it } from "vitest";
import {
  authenticatedLocalOrigins,
  installAuthenticatedLocalTransport,
  localAuthenticatedRedirect,
} from "./helpers/authenticated-local-transport";

const projectRef = "disposable-qa";
const supabaseURL = `https://${projectRef}.supabase.co`;

describe("authenticated test-only local transport", () => {
  it.each([
    "https://akipasa.com",
    "http://business.akipasa.com:3100",
    "http://127.0.0.1",
    "http://user:secret@127.0.0.1:3100",
    "http://127.0.0.1:3100/path",
    "http://127.0.0.1:3100?next=external",
    "https://127.0.0.1:3100",
  ])("rejects unsafe base without performing requests: %s", (baseURL) => {
    expect(() => authenticatedLocalOrigins(baseURL, projectRef)).toThrow();
  });
  it.each(["akipasa", "vhpbvcfkcteswlsdjrfl", "qa.supabase.co", ""])(
    "rejects production or malformed QA reference: %s",
    (ref) => {
      expect(() =>
        authenticatedLocalOrigins("http://127.0.0.1:3100", ref),
      ).toThrow();
    },
  );
  it("rewrites only exact canonical redirect origins and retains query identity", () => {
    const local = "http://127.0.0.1:3100";
    expect(
      localAuthenticatedRedirect(
        "https://business.akipasa.com/en/business?view=growth",
        `${local}/en/business`,
        local,
      ),
    ).toBe(`${local}/en/business?view=growth`);
    expect(
      localAuthenticatedRedirect(
        "/en/account?from=business",
        `${local}/en/auth`,
        local,
      ),
    ).toBe(`${local}/en/account?from=business`);
    for (const target of [
      "https://business.akipasa.com.evil.test/en/business",
      "https://user:secret@business.akipasa.com/en/business",
      "https://akipasa.com:444/en",
      "http://business.akipasa.com/en/business",
      "//evil.test/en",
    ])
      expect(() =>
        localAuthenticatedRedirect(target, `${local}/en`, local),
      ).toThrow();
  });

  it("keeps virtual business requests, redirects, cookies and credentials on the local socket", async () => {
    const observed: Array<{
      path: string;
      host?: string;
      cookie?: string;
      body: string;
    }> = [];
    const server = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      observed.push({
        path: req.url || "",
        host: req.headers.host,
        cookie: req.headers.cookie,
        body,
      });
      if (req.url === "/en/start") {
        res.writeHead(307, {
          Location: "https://business.akipasa.com/en/business?view=growth",
        });
        res.end();
      } else if (req.url === "/en/unsafe") {
        res.writeHead(307, { Location: "https://unexpected.invalid/private" });
        res.end();
      } else if (req.url === "/en/cookies") {
        const bytes = gzipSync(
          "<!doctype html><main>Compressed local QA</main>",
        );
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Content-Encoding": "gzip",
          "Content-Length": String(bytes.length),
          "Set-Cookie": [
            "qa-first=one; Path=/; HttpOnly",
            "qa-second=two; Path=/; HttpOnly",
          ],
        });
        res.end(bytes);
      } else {
        res.setHeader("Content-Type", "text/html");
        res.end("<!doctype html><main>Local QA business</main>");
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing local listener");
    const baseURL = `http://127.0.0.1:${address.port}`;
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    const context = await browser.newContext({
      baseURL,
      serviceWorkers: "block",
    });
    let transport:
      | Awaited<ReturnType<typeof installAuthenticatedLocalTransport>>
      | undefined;
    try {
      transport = await installAuthenticatedLocalTransport(context, {
        baseURL,
        projectRef,
        supabaseURL,
      });
      await context.addCookies([
        { name: "qa-session", value: "inert-session", url: baseURL },
      ]);
      const page = await context.newPage();
      await page.goto(`${transport.origin}/en/start`);
      expect(page.url()).toBe(`${transport.origin}/en/business?view=growth`);
      expect(await page.locator("main").textContent()).toBe(
        "Local QA business",
      );
      const business = observed.find((request) =>
        request.path.includes("/en/business"),
      );
      expect(business?.host).toBe("business.akipasa.com");
      expect(business?.cookie).toContain("qa-session=inert-session");
      await page.evaluate(async () => {
        await fetch("/en/auth", {
          method: "POST",
          body: "inert-password-proof",
        });
      });
      expect(
        observed.find((request) => request.path === "/en/auth")?.body,
      ).toBe("inert-password-proof");
      await page.goto(`${transport.origin}/en/cookies`);
      expect(await page.locator("main").textContent()).toBe(
        "Compressed local QA",
      );
      expect((await context.cookies()).map((cookie) => cookie.name)).toEqual(
        expect.arrayContaining(["qa-first", "qa-second"]),
      );
      const assertSafe = transport.assertSafe;
      assertSafe();
      expect((await page.goto(`${transport.origin}/en/unsafe`))?.status()).toBe(
        502,
      );
      expect(assertSafe).toThrow("redirect failed");
      expect(observed.map((request) => request.path)).not.toContain("/private");
      await expect(
        page.goto("https://unexpected.invalid/en/business"),
      ).rejects.toThrow();
      expect(assertSafe).toThrow("unallowlisted browser origin");
    } finally {
      await transport?.close();
      await context.close();
      await browser.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }, 30_000);
});
