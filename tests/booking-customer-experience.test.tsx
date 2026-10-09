// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach,describe,it,expect,vi } from "vitest";
import { cleanup,render,screen,fireEvent } from "@testing-library/react";
import { MyBookings } from "../src/components/MyBookings";
import { BookingWizard } from "../src/components/BookingWizard";

afterEach(cleanup);
const day = (offset:number) => new Date(Date.now()+offset*86400000).toISOString();
const bookings = [
  {id:"1",party_size:2,status:"requested",created_at:day(-1),venue:{name:"Beasty Bites",slug:"beasty-bites"},slot:{starts_at:day(3),ends_at:day(3.1)}},
  {id:"2",party_size:3,status:"confirmed",created_at:day(-2),venue:{name:"Sports Club",slug:"sports-club"},slot:{starts_at:day(-0.01),ends_at:day(0.05)}},
  {id:"3",party_size:1,status:"completed",created_at:day(-5),venue:{name:"Old Tour",slug:"old-tour"},slot:{starts_at:day(-4),ends_at:day(-3.9)}},
];

describe("Account My Bookings",()=>{
  it("separates upcoming active and past bookings with clear status cards",()=>{
    render(<MyBookings locale="en" bookings={bookings}/>);
    expect(screen.getByText("Beasty Bites")).toBeVisible();
    expect(screen.getByText("Pending approval")).toBeVisible();
    fireEvent.click(screen.getByRole("button",{name:/Active/}));
    expect(screen.getByText("Sports Club")).toBeVisible();
    expect(screen.queryByText("Beasty Bites")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:/Past/}));
    expect(screen.getByText("Old Tour")).toBeVisible();
  });
  it("shows a useful empty state without fake reservations",()=>{
    render(<MyBookings locale="es" bookings={[]}/>);
    expect(screen.getByText("Nada por aquí todavía")).toBeVisible();
    expect(screen.getByRole("link",{name:/Explorar locales/})).toHaveAttribute("href","/es");
  });
});

const slots=[
  {id:"00000000-0000-4000-8000-000000000001",starts_at:day(2),ends_at:day(2.04),capacity:2,offering_id:null},
  {id:"00000000-0000-4000-8000-000000000002",starts_at:day(3),ends_at:day(3.04),capacity:6,offering_id:"00000000-0000-4000-8000-000000000003"},
];
const wizardProps={
 locale:"en" as const,slug:"beasty-bites",venueId:"00000000-0000-4000-8000-000000000000",
 venueName:"Beasty Bites",slots,offerings:{"00000000-0000-4000-8000-000000000003":"Breakfast"},
 profile:{name:"Test User",email:"person@example.com",phone:""},submit:vi.fn(async ()=>{}),
};
describe("Customer booking wizard",()=>{
  it("uses steps and guest buttons limited by the selected slot",()=>{
    render(<BookingWizard {...wizardProps}/>);
    expect(screen.getByText("Choose a date")).toBeVisible();
    fireEvent.click(screen.getByRole("button",{name:/Continue/}));
    expect(screen.getByText("How many guests?")).toBeVisible();
    const plus=screen.getByRole("button",{name:"Add guest"});
    fireEvent.click(plus);
    expect(screen.getByText("2",{selector:".booking-guest-counter strong"})).toBeVisible();
    expect(plus).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:/Continue/}));
    expect(screen.getByText("Contact details")).toBeVisible();
    expect(screen.getByRole("button",{name:"Request booking"})).toBeEnabled();
  });
  it("offers the Spanish step flow",()=>{
    render(<BookingWizard {...wizardProps} locale="es"/>);
    expect(screen.getByText("Elige el día")).toBeVisible();
    expect(screen.getByRole("button",{name:/Continuar/})).toBeVisible();
  });
});
