/** Server-owned dark-launch switch; URL and browser state cannot enable it. */
export function tonightEnabled(value = process.env.AKIPASA_TONIGHT_ENABLED) {
  return value === "true";
}
