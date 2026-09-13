export function normalizePhone(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_phone");
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11) digits = "55" + digits;
  if (!/^55[1-9][0-9]9\d{8}$/.test(digits)) throw new Error("invalid_phone");
  return digits;
}
export function fullName(value: unknown): string {
  if (typeof value !== "string") throw new Error("invalid_name");
  const s = value.trim().replace(/\s+/g, " ");
  if (
    s.length < 5 ||
    s.length > 120 ||
    !s.includes(" ") ||
    /[<>\x00-\x1f]/.test(s)
  )
    throw new Error("invalid_name");
  return s;
}
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new Error("invalid_request");
  return value;
}
export function validStart(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)))
    throw new Error("invalid_time");
  const date = new Date(value);
  if (
    date.getUTCMinutes() !== 0 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  )
    throw new Error("invalid_time");
  return date.toISOString();
}
export function transitionAllowed(
  from: string,
  to: string,
  expires: number,
  start: number,
  now: number,
) {
  return from === "pending_payment"
    ? ["expired", "cancelled"].includes(to) ||
        (to === "confirmed" && expires > now)
    : from === "confirmed"
      ? to === "cancelled" || (to === "completed" && start + 3600000 <= now)
      : false;
}
