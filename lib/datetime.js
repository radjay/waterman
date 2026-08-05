/**
 * Memoised Intl formatters.
 *
 * `new Intl.DateTimeFormat(...)` costs ~37µs; reusing one costs ~0.6µs. That is
 * a 57x difference and it was being paid PER SLOT — `isChartedSlot` calls
 * `localHour`, and Next runs that over six days × every spot × every slot while
 * Now runs it over every spot outside your favourites.
 *
 * The formatters are immutable and stateless, so one instance per
 * locale+options is safe to share for the life of the process.
 */
const cache = new Map();

/**
 * A cached `Intl.DateTimeFormat`.
 *
 * Callers pass the same small set of option objects over and over, so the key
 * is built from the values rather than identity — two structurally identical
 * option objects must hit the same formatter or the cache does nothing.
 */
export function dtf(locale, options) {
  // Options are small and fixed-shape here; sorting keeps the key stable
  // regardless of literal ordering at the call site.
  const key =
    locale +
    "|" +
    Object.keys(options)
      .sort()
      .map((k) => `${k}:${options[k]}`)
      .join(",");

  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    cache.set(key, formatter);
  }
  return formatter;
}
