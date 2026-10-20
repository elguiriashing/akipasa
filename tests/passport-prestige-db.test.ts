// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const admin = "10000000-0000-0000-0000-000000000001";
const member = "10000000-0000-0000-0000-000000000002";
const other = "10000000-0000-0000-0000-000000000003";
const login = async (id: string, role = "authenticated") => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec(`set role ${role}`);
};
const reset = () => db.exec("reset role");
const rpc = async (name: string, action: string, payload = {}) => {
  const { rows } = await db.query<{ value: any }>( // eslint-disable-line @typescript-eslint/no-explicit-any
    `select public.${name}($1,$2::jsonb) value`,
    [action, JSON.stringify(payload)],
  );
  return rows[0].value;
};
const shared = async (id: string | null = null) => {
  const { rows } = await db.query<{ value: unknown[] }>(
    "select public.prestige_public($1,1) value",
    [id],
  );
  return rows[0].value;
};
beforeAll(async () => {
  await db.exec(await readFile("tests/passport-db-fixture.sql", "utf8"));
  for (const file of [
    "database/migrations/20260916103318_managed_achievements.sql",
    "database/migrations/20260916115126_activity_achievements.sql",
    "supabase/migrations/20261003193908_passport_city_collection.sql",
    "supabase/migrations/20261003203205_passport_award_replacement_history.sql",
    "supabase/migrations/20261020170436_passport_prestige.sql",
  ])
    await db.exec(await readFile(file, "utf8"));
  await db.exec(
    `insert into auth.users values('${admin}','admin@example.test'),('${member}','member@example.test'),('${other}','other@example.test');insert into public.profiles values('${admin}','Admin','administrator'),('${member}','Member','consumer'),('${other}','Other','consumer');grant usage on schema public,auth,private to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
}, 30000);
afterAll(() => db.close());

describe.sequential("prestige database security and lifecycle", () => {
  let award: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  it("keeps the launch gate closed in SQL and prevents anonymous/member admin calls", async () => {
    await login(member);
    await expect(rpc("prestige_member", "read")).rejects.toThrow("unavailable");
    expect(await rpc("prestige_member", "export")).toEqual({
      awards: [],
      physical_requests: [],
      shipping_addresses: [],
    });
    await expect(rpc("prestige_admin", "read")).rejects.toThrow(
      "administrator",
    );
    await expect(
      db.query("select * from private.prestige_awards"),
    ).rejects.toThrow("permission denied");
    await login("", "anon");
    await expect(rpc("prestige_member", "read")).rejects.toThrow(
      "permission denied",
    );
    expect(await shared()).toEqual([]);
    await reset();
    await db.exec("update private.prestige_settings set enabled=true");
  });
  it("configures validated immutable requirements as inactive, then activates explicitly", async () => {
    await login(admin);
    const programme = {
      key: "city_cafe_master",
      title_es: "Maestro del café",
      title_en: "Cafe master",
      achievement_keys: ["stamp_fuengirola_cafe_5"],
      physical_eligible: true,
    };
    const draft = await rpc("prestige_admin", "configure", programme);
    expect(draft.active).toBe(false);
    await expect(rpc("prestige_admin", "configure", programme)).rejects.toThrow(
      "immutable",
    );
    await expect(
      rpc("prestige_admin", "configure", {
        ...programme,
        key: "invalid_keys",
        achievement_keys: ["missing"],
      }),
    ).rejects.toThrow("unavailable");
    await rpc("prestige_admin", "programme_status", {
      key: programme.key,
      active: true,
    });
    await login(member);
    const read = await rpc("prestige_member", "read");
    expect(read.programmes[0].requirements[0].current).toBe(0);
    await expect(
      rpc("prestige_member", "claim", {
        programme_key: programme.key,
        current: 500,
      }),
    ).rejects.toThrow("not met");
  });
  it("does not accept manual recognition, test accounts, repeated or rejected visits", async () => {
    await login(admin);
    await rpc("admin_passport_awards", "grant", {
      profile_id: member,
      achievement_key: "stamp_fuengirola_cafe_5",
      purpose: "recognition",
      reason: "Manual recognition is not activity",
      request_id: crypto.randomUUID(),
    });
    await login(member);
    await expect(
      rpc("prestige_member", "claim", { programme_key: "city_cafe_master" }),
    ).rejects.toThrow("not met");
    await reset();
    await db.exec(`insert into public.cities values('30000000-0000-0000-0000-000000000001','Los Boliches','Los Boliches','los-boliches','Europe/Madrid');
    insert into public.venues select ('40000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'30000000-0000-0000-0000-000000000001','published',true,'point','Venue '||n,'venue-'||n from generate_series(1,5) n;
    select set_config('request.jwt.claim.sub','${admin}',false);
    insert into public.venue_achievement_categories select id,'cafe' from public.venues;
    insert into public.check_ins select gen_random_uuid(),'${member}',id,'accepted',now() from public.venues where slug='venue-1';
    insert into public.check_ins select gen_random_uuid(),'${member}',id,'accepted',now() from public.venues where slug='venue-1';
    insert into public.check_ins select gen_random_uuid(),'${member}',id,'cooldown',now() from public.venues;`);
    await login(member);
    await expect(
      rpc("prestige_member", "claim", { programme_key: "city_cafe_master" }),
    ).rejects.toThrow("not met");
    await reset();
    await db.exec(
      `insert into public.check_ins select gen_random_uuid(),'${member}',id,'accepted',now() from public.venues where slug<>'venue-1';insert into private.passport_test_accounts(profile_id,marked_by) values('${member}','${admin}');`,
    );
    await login(member);
    await expect(
      rpc("prestige_member", "claim", { programme_key: "city_cafe_master" }),
    ).rejects.toThrow("test accounts");
    await reset();
    await db.exec(
      `delete from private.passport_test_accounts where profile_id='${member}'`,
    );
  });
  it("issues one durable serial/evidence snapshot and exactly one earned audit entry on retries", async () => {
    await login(member);
    award = await rpc("prestige_member", "claim", {
      programme_key: "city_cafe_master",
    });
    const retry = await rpc("prestige_member", "claim", {
      programme_key: "city_cafe_master",
    });
    expect(retry.id).toBe(award.id);
    expect(retry.serial).toBe(award.serial);
    expect(award.profile_id).toBeUndefined();
    expect(award.evidence[0].count).toBe(5);
    await reset();
    const rows = await db.query<{ n: number }>(
      "select count(*)::integer n from private.prestige_audit where action='earned'",
    );
    expect(rows.rows[0].n).toBe(1);
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::integer n from public.xp_ledger",
        )
      ).rows[0].n,
    ).toBe(0);
  });
  it("isolates owners, denies direct updates/audit rewrites and defaults public sharing off", async () => {
    await login(other);
    expect((await rpc("prestige_member", "read")).awards).toEqual([]);
    expect(await rpc("prestige_member", "export")).toEqual({
      awards: [],
      physical_requests: [],
      shipping_addresses: [],
    });
    await expect(
      rpc("prestige_member", "visibility", {
        award_id: award.id,
        shared: true,
        hall_of_fame: true,
        public_alias: "Other",
      }),
    ).rejects.toThrow("not found");
    await expect(
      rpc("prestige_member", "request_physical", { award_id: award.id }),
    ).rejects.toThrow("not found");
    await expect(
      db.exec("update private.prestige_awards set shared=true"),
    ).rejects.toThrow("permission denied");
    await expect(db.exec("delete from private.prestige_audit")).rejects.toThrow(
      "permission denied",
    );
    await login("", "anon");
    expect(await shared(award.public_id)).toEqual([]);
  });
  it("supports separate sharing and Hall opt-ins and immediately withdraws publication", async () => {
    await login(member);
    await expect(
      rpc("prestige_member", "visibility", {
        award_id: award.id,
        shared: false,
        hall_of_fame: true,
        public_alias: "Explorer",
      }),
    ).rejects.toThrow();
    await rpc("prestige_member", "visibility", {
      award_id: award.id,
      shared: true,
      hall_of_fame: false,
      public_alias: "Explorer",
    });
    await login("", "anon");
    const certificate = await shared(award.public_id);
    expect(certificate).toHaveLength(1);
    expect(certificate[0]).not.toHaveProperty("profile_id");
    expect(certificate[0]).not.toHaveProperty("evidence");
    expect(await shared()).toEqual([]);
    await login(member);
    await rpc("prestige_member", "visibility", {
      award_id: award.id,
      shared: true,
      hall_of_fame: true,
      public_alias: "Explorer",
    });
    await login("", "anon");
    expect(await shared()).toHaveLength(1);
    await login(member);
    await rpc("prestige_member", "visibility", {
      award_id: award.id,
      shared: false,
      hall_of_fame: false,
      public_alias: "",
    });
    await login("", "anon");
    expect(await shared(award.public_id)).toEqual([]);
  });
  it("records physical interest once, allows reviewed status but cannot authorise shipping", async () => {
    await login(member);
    await rpc("prestige_member", "request_physical", { award_id: award.id });
    await rpc("prestige_member", "request_physical", { award_id: award.id });
    expect((await rpc("prestige_member", "read")).fulfilment_enabled).toBe(
      false,
    );
    await expect(
      rpc("prestige_admin", "review", {
        award_id: award.id,
        status: "reviewed",
        reason: "Checked",
      }),
    ).rejects.toThrow("administrator");
    await login(admin);
    expect((await rpc("prestige_admin", "read")).requests).toHaveLength(1);
    await expect(
      rpc("prestige_admin", "review", {
        award_id: award.id,
        status: "shipped",
        reason: "Ship it",
      }),
    ).rejects.toThrow("fulfilment disabled");
    await rpc("admin_passport_awards", "mark_test", {
      profile_id: member,
      enabled: true,
    });
    await expect(
      rpc("prestige_admin", "review", {
        award_id: award.id,
        status: "reviewed",
        reason: "Test account",
      }),
    ).rejects.toThrow("eligibility requires review");
    await rpc("admin_passport_awards", "mark_test", {
      profile_id: member,
      enabled: false,
    });
    await rpc("prestige_admin", "review", {
      award_id: award.id,
      status: "reviewed",
      reason: "Eligibility reviewed, no dispatch",
    });
    expect((await rpc("prestige_admin", "read")).requests[0].status).toBe(
      "reviewed",
    );
  });
  it("keeps shipping disabled until approved intake and retention are both configured", async () => {
    const address = {
      award_id: award.id,
      recipient_name: "Test Recipient",
      address_line1: "1 Test Road",
      postal_code: "12345",
      city: "Test City",
      country_code: "ES",
    };
    await login(member);
    await expect(
      rpc("prestige_member", "shipping_submit", address),
    ).rejects.toThrow("shipping intake disabled");
    await reset();
    await db.exec(
      "update private.prestige_settings set shipping_intake_enabled=true",
    );
    await login(member);
    await expect(
      rpc("prestige_member", "shipping_submit", address),
    ).rejects.toThrow("shipping intake disabled");
    await reset();
    await db.exec(
      "update private.prestige_settings set address_retention_days=30,address_purge_ready=true",
    ); // Synthetic test setting only.
    await login(member);
    await rpc("prestige_member", "shipping_submit", address);
    expect(
      (await rpc("prestige_member", "shipping_read", { award_id: award.id }))
        .recipient_name,
    ).toBe("Test Recipient");
    expect(
      (await rpc("prestige_member", "export")).shipping_addresses,
    ).toHaveLength(1);
    await expect(
      db.query("select * from private.prestige_shipping_addresses"),
    ).rejects.toThrow("permission denied");
    await login(other);
    await expect(
      rpc("prestige_member", "shipping_read", { award_id: award.id }),
    ).rejects.toThrow("not found");
    await expect(
      rpc("prestige_member", "shipping_delete", { award_id: award.id }),
    ).rejects.toThrow("not found");
    expect((await rpc("prestige_member", "export")).shipping_addresses).toEqual(
      [],
    );
    await expect(
      rpc("prestige_admin", "read_shipping", {
        award_id: award.id,
        reason: "Delivery review",
      }),
    ).rejects.toThrow("administrator");
    await login(admin);
    await expect(
      rpc("prestige_admin", "read_shipping", {
        award_id: award.id,
        reason: "",
      }),
    ).rejects.toThrow("reason required");
    expect(
      (
        await rpc("prestige_admin", "read_shipping", {
          award_id: award.id,
          reason: "Delivery review",
        })
      ).recipient_name,
    ).toBe("Test Recipient");
    await expect(
      rpc("prestige_admin", "delivery", {
        award_id: award.id,
        expected_status: "ready",
        status: "preparing",
        reason: "Prepare test",
      }),
    ).rejects.toThrow("fulfilment disabled");
    await reset();
    const audit = await db.query<{ detail: unknown }>(
      "select detail from private.prestige_audit where action in ('address_submitted','address_read_admin')",
    );
    expect(JSON.stringify(audit.rows)).not.toContain("Test Recipient");
    expect(JSON.stringify(audit.rows)).not.toContain("1 Test Road");
  });
  it("enforces expiry and bounded service-only purge without retaining address payloads", async () => {
    await reset();
    await db.exec(
      `update private.prestige_shipping_addresses set delete_after=now()-interval '1 second';`,
    );
    await login(member);
    expect(
      await rpc("prestige_member", "shipping_read", { award_id: award.id }),
    ).toBeNull();
    expect((await rpc("prestige_member", "export")).shipping_addresses).toEqual(
      [],
    );
    await expect(
      db.query("select public.purge_prestige_shipping(100)"),
    ).rejects.toThrow("permission denied");
    await login(admin);
    await expect(
      rpc("prestige_admin", "read_shipping", {
        award_id: award.id,
        reason: "Expired read",
      }),
    ).rejects.toThrow("address unavailable");
    await login("", "service_role");
    expect(
      (
        await db.query<{ n: number }>(
          "select public.purge_prestige_shipping(1) n",
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await db.query<{ n: number }>(
          "select public.purge_prestige_shipping(1) n",
        )
      ).rows[0].n,
    ).toBe(0);
    await expect(
      db.query("select * from private.prestige_shipping_addresses"),
    ).rejects.toThrow("permission denied");
  });
  it("keeps owner privacy read/deletion and public withdrawal available with launch closed", async () => {
    await login(member);
    await rpc("prestige_member", "shipping_submit", {
      award_id: award.id,
      recipient_name: "Test Recipient",
      address_line1: "1 Test Road",
      postal_code: "12345",
      city: "Test City",
      country_code: "ES",
    });
    await reset();
    await db.exec("update private.prestige_settings set enabled=false");
    await login(member);
    expect(
      (await rpc("prestige_member", "shipping_read", { award_id: award.id }))
        .country_code,
    ).toBe("ES");
    await rpc("prestige_member", "withdraw", { award_id: award.id });
    await rpc("prestige_member", "shipping_delete", { award_id: award.id });
    expect(
      await rpc("prestige_member", "shipping_read", { award_id: award.id }),
    ).toBeNull();
    await reset();
    await db.exec("update private.prestige_settings set enabled=true");
  });
  it("authorises manual delivery-state transitions with optimistic concurrency and never places an order", async () => {
    await login(member);
    await rpc("prestige_member", "shipping_submit", {
      award_id: award.id,
      recipient_name: "Test Recipient",
      address_line1: "1 Test Road",
      postal_code: "12345",
      city: "Test City",
      country_code: "ES",
    });
    await reset();
    await db.exec("update private.prestige_settings set delivery_enabled=true");
    await login(admin);
    await expect(
      rpc("prestige_admin", "delivery", {
        award_id: award.id,
        expected_status: "ready",
        status: "shipped",
        reason: "Skip test",
      }),
    ).rejects.toThrow("invalid delivery transition");
    await rpc("prestige_admin", "delivery", {
      award_id: award.id,
      expected_status: "ready",
      status: "preparing",
      reason: "Manual preparation test",
    });
    await expect(
      rpc("prestige_admin", "delivery", {
        award_id: award.id,
        expected_status: "ready",
        status: "preparing",
        reason: "Duplicate transition",
      }),
    ).rejects.toThrow("delivery state changed");
    await login(member);
    await expect(
      rpc("prestige_admin", "delivery", {
        award_id: award.id,
        expected_status: "preparing",
        status: "shipped",
        reason: "Member attempt",
      }),
    ).rejects.toThrow("administrator");
    await login(admin);
    await rpc("prestige_admin", "delivery", {
      award_id: award.id,
      expected_status: "preparing",
      status: "shipped",
      reason: "Manual dispatch test",
      tracking_reference: "TEST-TRACKING",
    });
    await login(member);
    await rpc("prestige_member", "shipping_delete", { award_id: award.id });
    expect(
      (await rpc("prestige_member", "read")).awards[0].tracking_reference,
    ).toBe("TEST-TRACKING");
    await login(admin);
    await rpc("prestige_admin", "delivery", {
      award_id: award.id,
      expected_status: "shipped",
      status: "delivered",
      reason: "Manual delivery test",
    });
    expect(
      (await rpc("prestige_admin", "read")).requests[0].delivery_status,
    ).toBe("delivered");
    await reset();
    await db.exec(
      "update private.prestige_settings set shipping_intake_enabled=false,delivery_enabled=false,address_retention_days=null,address_purge_ready=false",
    );
  });
  it("intersects restricted-account completion with reward/intake actions but preserves privacy", async () => {
    await reset();
    await db.exec(
      "create function public.account_features_allowed() returns boolean language sql as $$select false$$;grant execute on function public.account_features_allowed() to authenticated;",
    );
    await login(member);
    await expect(
      rpc("prestige_member", "claim", { programme_key: "city_cafe_master" }),
    ).rejects.toThrow("account completion required");
    await expect(
      rpc("prestige_member", "request_physical", { award_id: award.id }),
    ).rejects.toThrow("account completion required");
    expect((await rpc("prestige_member", "export")).awards).toHaveLength(1);
    await rpc("prestige_member", "shipping_delete", { award_id: award.id });
    await rpc("prestige_member", "withdraw", { award_id: award.id });
    await reset();
    await db.exec("drop function public.account_features_allowed()");
  });
  it("freezes the configured requirement definition and fails closed after catalogue edits", async () => {
    await reset();
    await db.exec(
      `select set_config('request.jwt.claim.sub','${admin}',false);update public.achievements set target_count=1 where key='stamp_fuengirola_cafe_5';`,
    );
    await login(member);
    expect(
      (await rpc("prestige_member", "read")).programmes[0].definition_current,
    ).toBe(false);
    await expect(
      rpc("prestige_member", "claim", { programme_key: "city_cafe_master" }),
    ).rejects.toThrow("requirements changed");
    await reset();
    await db.exec(
      `select set_config('request.jwt.claim.sub','${admin}',false);update public.achievements set target_count=5 where key='stamp_fuengirola_cafe_5';`,
    );
  });
  it("revokes public eligibility while retaining original records and does not restore through claim retry", async () => {
    await login(member);
    await rpc("prestige_member", "visibility", {
      award_id: award.id,
      shared: true,
      hall_of_fame: true,
      public_alias: "Explorer",
    });
    await login(admin);
    await rpc("prestige_admin", "revoke", {
      award_id: award.id,
      reason: "Fraud review",
    });
    await login("", "anon");
    expect(await shared(award.public_id)).toEqual([]);
    await login(member);
    await expect(
      rpc("prestige_member", "claim", { programme_key: "city_cafe_master" }),
    ).rejects.toThrow("revoked");
    expect((await rpc("prestige_member", "read")).awards).toHaveLength(1);
  });
});
