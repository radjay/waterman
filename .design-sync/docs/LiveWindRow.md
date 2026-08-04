---
category: Legacy
---

Live wind readings for a spot, shown as a row above the day's forecast.

**Requires a live-wind API route.** This component takes no data props: it
fetches `/api/live-wind/<stationId>` itself and returns `null` while loading,
on error, or when the newest reading is more than 60 minutes old. Outside the
Waterman app — including in a design built from this system — that route does
not exist, so the component renders nothing.

Use it only where that endpoint is available. For a static composition showing
wind values, use `WindGroup` or `ConditionLine` with forecast data instead.

There is deliberately no preview card: any card would show only the surrounding
layout, never the component's own output.
