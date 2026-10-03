import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";
import type { PassportCollection } from "./passport-collection";
export const myPassportCollection = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("passport_collection");
  if (error) throw new Error("Passport collection unavailable");
  return data as PassportCollection;
});
