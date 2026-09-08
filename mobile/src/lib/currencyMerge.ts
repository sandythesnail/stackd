/**
 * How the two spendable currencies are merged when a device meets the cloud.
 *
 * IMPORT-FREE ON PURPOSE, like webAced.ts beside it. app.js carries the same rule (its own
 * mergeCurrency), the two apps write the same Supabase row, and two merge rules fighting over
 * one balance is a money bug nobody can reproduce. scripts/check-currency-merge.js compiles
 * this file on its own and runs both copies over one table, which is only possible while it
 * has no imports. Keep it that way.
 */

/** Coin and diamond balances as this device last SUCCESSFULLY uploaded them, recorded after
 * a confirmed upsert and persisted per account (see lib/SupabaseSync.tsx). */
export type CurrencyBaseline = { coins: number; diamonds: number } | null | undefined;

/**
 * How much this device has earned or spent since its last confirmed upload, applied on top
 * of whatever the cloud now says.
 *
 *   merged = remote + (local - lastPushed)
 *
 * This replaces `Math.max(local, remote)`, and it is the difference between a heuristic and
 * an answer. max() encodes "currency only ever goes up", which stops being true the moment
 * anything is bought: spend 500 coins on the laptop, open the phone whose cached snapshot
 * still reads the old balance, and max() keeps the higher number and re-uploads it. The
 * purchase is refunded, the item is kept (ownedItems is unioned, not max()-ed), and it
 * repeats for as long as anyone cares to. app.js documented this as a known limitation whose
 * real fix was "a server-applied delta rather than a client-mergeable absolute number".
 *
 * It turns out no server is required. The one thing a device knows for certain is what it
 * itself last put in the row, so anything its local balance has moved since is its own
 * unsynced change and nobody else's — which is exactly the delta to carry over.
 *
 * Strictly better than max() on every case max() was added for, rather than a trade:
 *
 *   - a streak reward claimed seconds ago that the debounce hasn't uploaded yet is
 *     `local - lastPushed = +N`, and survives — the original bug report — and it survives
 *     whether or not the remote read is stale, which max() only managed when local happened
 *     to be the larger number;
 *   - two devices earning while offline no longer take the larger of the two, they add up;
 *   - a purchase made elsewhere is no longer refunded, because a device with nothing of its
 *     own outstanding contributes a delta of zero and simply accepts the cloud's balance.
 *
 * With no baseline — a fresh install, cleared storage, an account this device has never
 * pushed for — earnings and a stale cache are indistinguishable, so it falls back to max().
 * That is the conservative direction: it can hand currency back, never take it.
 *
 * Clamped at zero. Two devices can each spend against the same balance while offline, and
 * the arithmetic of that is a negative number rather than a debt to show anyone.
 */
export function mergeCurrency(
  local: number,
  remote: number | undefined,
  baseline: number | undefined,
): number {
  if (typeof remote !== 'number' || !Number.isFinite(remote)) return local;
  if (typeof baseline !== 'number' || !Number.isFinite(baseline)) return Math.max(local, remote);
  return Math.max(0, remote + (local - baseline));
}
