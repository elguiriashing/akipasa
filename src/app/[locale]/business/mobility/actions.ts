"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { rentalEurosToCents } from "@/lib/akiconduzco";

function location(locale: "en" | "es", query: string) {
  return `/${locale}/business/mobility?${query}`;
}

export async function createRentalCompany(formData: FormData) {
  const localeValue = String(formData.get("locale"));
  const locale = isLocale(localeValue) ? localeValue : "es";
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      city: z.string().trim().min(2).max(100),
      address: z.string().trim().min(4).max(240),
      latitude: z.coerce.number().min(27).max(44),
      longitude: z.coerce.number().min(-19).max(5),
      website: z
        .union([
          z.literal(""),
          z
            .string()
            .url()
            .refine((url) => new URL(url).protocol === "https:"),
        ])
        .default(""),
      phone: z.string().trim().max(40).default(""),
      addressSelection: z.literal("selected"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(location(locale, "error=company"));
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/business/mobility`,
  );
  const base =
    parsed.data.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "rental-company";
  const slug = `${base}-${user.id.slice(0, 6)}`;
  const { error } = await supabase.from("car_rental_companies").insert({
    slug,
    name: parsed.data.name,
    city: parsed.data.city,
    address: parsed.data.address,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    website_url: parsed.data.website || null,
    phone: parsed.data.phone || null,
    submitted_by: user.id,
    status: "pending_review",
  });
  if (error) redirect(location(locale, "error=company"));
  revalidatePath(`/${locale}/business/mobility`);
  redirect(location(locale, "created=company"));
}

export async function createRentalVehicle(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      category: z.enum([
        "mini",
        "economy",
        "compact",
        "suv",
        "people_carrier",
        "premium",
        "electric",
        "van",
      ]),
      transmission: z.enum(["manual", "automatic"]),
      fuel: z.enum(["petrol", "diesel", "hybrid", "electric", "other"]),
      seats: z.coerce.number().int().min(2).max(9),
      luggage: z.coerce.number().int().min(0).max(12),
      dailyPrice: z.coerce.number().int().min(1).max(10000),
      deposit: z.coerce.number().int().min(0).max(50000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(location(locale, "error=vehicle"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/business/mobility`,
  );
  const { error } = await supabase.from("car_rental_vehicles").insert({
    company_id: parsed.data.companyId,
    name: parsed.data.name,
    category: parsed.data.category,
    transmission: parsed.data.transmission,
    fuel: parsed.data.fuel,
    seats: parsed.data.seats,
    luggage: parsed.data.luggage,
    daily_price_cents: rentalEurosToCents(parsed.data.dailyPrice),
    deposit_cents: rentalEurosToCents(parsed.data.deposit),
    active: true,
  });
  if (error) redirect(location(locale, "error=vehicle"));
  revalidatePath(`/${locale}/business/mobility`);
  redirect(location(locale, "created=vehicle"));
}

export async function updateRentalVehicle(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      dailyPrice: z.coerce.number().int().min(1).max(10000),
      deposit: z.coerce.number().int().min(0).max(50000),
      active: z.enum(["true", "false"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(location(locale, "error=vehicle"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/business/mobility`,
  );
  const { error } = await supabase
    .from("car_rental_vehicles")
    .update({
      daily_price_cents: rentalEurosToCents(parsed.data.dailyPrice),
      deposit_cents: rentalEurosToCents(parsed.data.deposit),
      active: parsed.data.active === "true",
    })
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", parsed.data.companyId);
  if (error) redirect(location(locale, "error=vehicle"));
  revalidatePath(`/${locale}/business/mobility`);
  redirect(location(locale, "updated=vehicle"));
}

export async function createRentalBlock(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .refine(
      (value) =>
        value.end > value.start &&
        value.start >= new Date().toISOString().slice(0, 10),
    )
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(location(locale, "error=availability"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/business/mobility`,
  );
  const { error } = await supabase.from("car_rental_calendar_blocks").insert({
    vehicle_id: parsed.data.vehicleId,
    start_date: parsed.data.start,
    end_date: parsed.data.end,
    reason: "maintenance",
  });
  if (error)
    redirect(
      location(
        locale,
        error.code === "PT409" ? "error=overlap" : "error=availability",
      ),
    );
  revalidatePath(`/${locale}/business/mobility`);
  redirect(location(locale, "created=availability"));
}

export async function updateRentalBookingStatus(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "es";
  const parsed = z
    .object({
      bookingId: z.string().uuid(),
      status: z.enum(["confirmed", "declined", "cancelled", "completed"]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(location(locale, "error=booking"));
  const { supabase } = await requireUser(
    locale,
    `/${locale}/business/mobility`,
  );
  const { error } = await supabase.rpc("set_car_rental_booking_status", {
    p_booking: parsed.data.bookingId,
    p_status: parsed.data.status,
  });
  if (error)
    redirect(
      location(
        locale,
        error.code === "PT409" ? "error=overlap" : "error=booking",
      ),
    );
  revalidatePath(`/${locale}/business/mobility`);
  redirect(location(locale, "updated=booking"));
}
