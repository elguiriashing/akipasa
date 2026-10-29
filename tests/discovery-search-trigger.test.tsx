import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { DiscoverySearchTrigger } from "../src/components/DiscoverySearchTrigger";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/en",
  useSearchParams: () =>
    new URLSearchParams("locality=fuengirola&radius=25&time=all"),
  useRouter: () => navigation,
}));
import { GlobalSearch } from "../src/components/GlobalSearch";

const fixtures: HTMLElement[] = [];
function panel() {
  const node = document.createElement("section");
  node.id = "site-search-panel";
  fixtures.push(node);
  return node;
}
async function mutate(change: () => void) {
  await act(async () => {
    change();
  });
}
afterEach(() => {
  cleanup();
  for (const node of fixtures.splice(0)) node.remove();
  vi.restoreAllMocks();
});

it.each([
  ["en", "What are you in the mood for?"],
  ["es", "¿Qué te apetece hacer?"],
] as const)(
  "keeps %s search named and disabled until the actual late filter form is ready",
  async (locale, label) => {
    render(<DiscoverySearchTrigger locale={locale} />);
    const trigger = screen.getByRole("button", { name: label });
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("popovertarget", "site-search-panel");
    const target = panel();
    await mutate(() => document.body.append(target));
    expect(trigger).toBeDisabled();
    const form = document.createElement("form");
    await mutate(() => target.append(form));
    expect(trigger).toBeDisabled();
    await mutate(() =>
      form.setAttribute("data-search-handlers-ready", "false"),
    );
    expect(trigger).toBeDisabled();
    await mutate(() => form.setAttribute("data-search-handlers-ready", "true"));
    await waitFor(() => expect(trigger).toBeEnabled());
  },
);

it("disables on handler cleanup and re-enables only after the replacement form is ready", async () => {
  const target = panel();
  const first = document.createElement("form");
  first.dataset.searchHandlersReady = "true";
  target.append(first);
  document.body.append(target);
  render(<DiscoverySearchTrigger locale="en" />);
  const trigger = screen.getByRole("button");
  await waitFor(() => expect(trigger).toBeEnabled());
  await mutate(() => delete first.dataset.searchHandlersReady);
  await waitFor(() => expect(trigger).toBeDisabled());
  await mutate(() => {
    first.dataset.searchHandlersReady = "true";
  });
  await waitFor(() => expect(trigger).toBeEnabled());
  const replacement = document.createElement("form");
  await mutate(() => first.replaceWith(replacement));
  await waitFor(() => expect(trigger).toBeDisabled());
  await mutate(() => {
    replacement.dataset.searchHandlersReady = "true";
  });
  await waitFor(() => expect(trigger).toBeEnabled());
  await mutate(() => target.remove());
  await waitFor(() => expect(trigger).toBeDisabled());
});

it("ignores handler markers outside the actual search panel", async () => {
  const unrelated = document.createElement("form");
  unrelated.dataset.searchHandlersReady = "true";
  fixtures.push(unrelated);
  document.body.append(unrelated);
  render(<DiscoverySearchTrigger locale="en" />);
  expect(screen.getByRole("button")).toBeDisabled();
  const target = panel();
  const readyForm = document.createElement("form");
  readyForm.dataset.searchHandlersReady = "true";
  target.append(readyForm);
  await mutate(() => document.body.append(target));
  await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
});

it.each(["en", "es"] as const)(
  "server-renders %s disabled even when the client document already contains a ready form",
  (locale) => {
    const target = panel();
    target.innerHTML = '<form data-search-handlers-ready="true"></form>';
    document.body.append(target);
    const html = renderToStaticMarkup(
      <DiscoverySearchTrigger locale={locale} />,
    );
    expect(html).toContain('disabled=""');
    expect(html).toContain('popoverTarget="site-search-panel"');
  },
);

it("disconnects its readiness observer when unmounted", () => {
  const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
  const mounted = render(<DiscoverySearchTrigger locale="en" />);
  mounted.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("keeps the real search entrance enabled through an unchanged valid submission without a form remount", async () => {
  navigation.replace.mockClear();
  const mounted = render(
    <>
      <GlobalSearch locale="en" />
      <DiscoverySearchTrigger locale="en" />
    </>,
  );
  const trigger = screen.getByRole("button", {
    name: "What are you in the mood for?",
  });
  const form = document.querySelector<HTMLFormElement>(
    "#site-search-panel form",
  )!;
  await waitFor(() => expect(trigger).toBeEnabled());
  expect(form.checkValidity()).toBe(true);
  expect(form.dataset.searchHandlersReady).toBe("true");
  // The real listener consumes submit and removes only its debounce marker.
  expect(fireEvent.submit(form)).toBe(false);
  expect(form.dataset.autoSubmitReady).toBeUndefined();
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledOnce());
  expect(document.querySelector("#site-search-panel form")).toBe(form);
  expect(form.dataset.autoSubmitReady).toBeUndefined();
  expect(form.dataset.searchHandlersReady).toBe("true");
  expect(trigger).toBeEnabled();
  mounted.unmount();
  expect(form.dataset.searchHandlersReady).toBeUndefined();
});
