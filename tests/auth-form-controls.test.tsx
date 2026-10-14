// @vitest-environment jsdom
import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const formStatus = vi.hoisted(() => ({ pending: false }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => formStatus,
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-akipasa-product": "akipasa" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));

import {
  AuthEmailInput,
  AuthSubmitButton,
} from "@/components/AuthFormControls";
import AuthPage from "../src/app/[locale]/auth/page";

beforeEach(() => {
  sessionStorage.clear();
  formStatus.pending = false;
});
afterEach(cleanup);

it("restores only the safe email field from tab-local storage", () => {
  sessionStorage.setItem("akipasa:auth-email", "saved@example.test");
  render(<AuthEmailInput id="email" />);
  expect(screen.getByRole("textbox")).toHaveValue("saved@example.test");

  fireEvent.input(screen.getByRole("textbox"), {
    target: { value: "new@example.test" },
  });
  expect(sessionStorage.getItem("akipasa:auth-email")).toBe("new@example.test");
  expect(sessionStorage.length).toBe(1);
});

it("disables and renames a pending authentication submit", () => {
  formStatus.pending = true;
  render(<AuthSubmitButton idle="Sign in" pending="Signing in…" />);
  expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
});

it("associates signup password-policy feedback with the affected fields", async () => {
  render(
    await AuthPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({
        mode: "signup",
        error: "password-policy",
        next: "/en/account",
      }),
    }),
  );

  expect(screen.getByRole("alert")).toHaveTextContent("12 or more characters");
  expect(document.querySelector('input[name="password"]')).toHaveAttribute(
    "aria-describedby",
    "password-help auth-error",
  );
  expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
    "aria-describedby",
    "auth-error",
  );
  expect(screen.getByLabelText("Email")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

it("uses account-private sign-in feedback and marks both credentials", async () => {
  render(
    await AuthPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ error: "signin" }),
    }),
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "email or password was not accepted",
  );
  expect(screen.getByLabelText("Email")).toHaveAttribute(
    "aria-describedby",
    "auth-error",
  );
  expect(document.querySelector('input[name="password"]')).toHaveAttribute(
    "aria-describedby",
    "auth-error",
  );
});
