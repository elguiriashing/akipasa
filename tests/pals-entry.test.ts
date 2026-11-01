import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => vi.fn());
vi.mock("@/lib/pals/server", () => ({ previewAccess: access }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
import Entrance from "../src/app/[locale]/akipals/page";
import { identityPreviewHtml } from "@/components/pals/identity-preview";

beforeEach(() => {
  access.mockReset();
});
async function html(locale: string) {
  return (
    renderToStaticMarkup(createElement(() => null)) +
    renderToStaticMarkup(
      await Entrance({ params: Promise.resolve({ locale }) }),
    )
  );
}

describe("AkiPals identity entrance and localization", () => {
  it("describes the 3D wardrobe and routes authorized users with their locale", async () => {
    access.mockResolvedValue({ allowed: true, user: { id: "test-user" } });
    for (const locale of ["en", "es"]) {
      const result = await html(locale);
      expect(result).toContain(`/pals?lang=${locale}`);
      expect(result).toContain(
        locale === "es" ? "Abrir mi estudio 3D" : "Open my 3D studio",
      );
      expect(result).not.toContain("data:image");
      expect(result).not.toContain("Dress up, play");
      expect(result).not.toContain("Tu AkiPal guardado");
    }
  });
  it("keeps the studio link restricted for signed-out and uninvited visitors", async () => {
    access.mockResolvedValue({ allowed: false, user: null });
    expect(await html("es")).toContain("/es/auth?next=%2Fes%2Fakipals");
    access.mockResolvedValue({ allowed: false, user: { id: "uninvited" } });
    const result = await html("es");
    expect(result).toContain("prueba privada");
    expect(result).not.toContain('href="/pals');
  });
  it("fails closed when private authorization is unavailable", async () => {
    access.mockRejectedValue(new Error("unavailable"));
    expect(await html("en")).not.toContain('href="/pals');
  });
  it("localizes editor text without translating saved enum values", () => {
    const result = identityPreviewHtml("testnonce", "es");
    expect(result).toContain('<html lang="es">');
    expect(result).toContain('href="/es"');
    expect(result).toContain("Guardar estilo");
    expect(result).toContain('data-tab="Hair" role="tab"');
    expect(result).toContain("Pelo</span>");
    expect(result).toContain('"bodyStyle":["feminine","masculine"]');
    expect(result).not.toContain('data-tab="Rostro"');
    expect(result).toContain('href="/pals/world"');
    expect(result).toContain("Tu armario");
    expect(result).toContain("Entrar en el prototipo privado de AkiPals World");
    expect(identityPreviewHtml("testnonce")).toContain("Save look");
    expect(identityPreviewHtml("testnonce")).toContain("Your Wardrobe");
  });
});
