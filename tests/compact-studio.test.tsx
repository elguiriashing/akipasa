// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StudioTabs } from "../src/components/community/StudioTabs";

afterEach(cleanup);
describe("compact studio navigation", () => {
  it("preserves unsaved profile edits when switching panels", () => {
    render(
      <StudioTabs locale="en">
        <section>Upload images</section>
        <form>
          <label>
            Name
            <input defaultValue="Initial" />
          </label>
        </form>
        <section>My events</section>
      </StudioTabs>,
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Unsaved edit" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Images" }));
    expect(screen.getByRole("tabpanel").textContent).toContain("Upload images");
    fireEvent.click(screen.getByRole("tab", { name: "Profile" }));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Unsaved edit",
    );
  });
  it("opens an optional section when its field is invalid", () => {
    render(
      <StudioTabs locale="en">
        <section>Images</section>
        <form>
          <details>
            <summary>Translation</summary>
            <input aria-label="English biography" minLength={40} />
          </details>
        </form>
        <section>Events</section>
      </StudioTabs>,
    );
    fireEvent.invalid(screen.getByLabelText("English biography"));
    expect(
      screen.getByLabelText("English biography").closest("details")?.open,
    ).toBe(true);
  });
  it("supports keyboard tab navigation", () => {
    render(
      <StudioTabs locale="es">
        <section>Images</section>
        <section>Profile</section>
        <section>Events</section>
      </StudioTabs>,
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Perfil" }), {
      key: "ArrowRight",
    });
    expect(
      screen
        .getByRole("tab", { name: "Imágenes" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Imágenes" }),
    );
  });
});
