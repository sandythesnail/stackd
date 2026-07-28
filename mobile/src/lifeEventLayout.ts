/** Shared between the post-lesson life-event sheet (app/sheet/life-event.tsx) and the
 * mid-lesson ambient variant (AmbientLifeEventModal in app/learn/quest.tsx) so both surfaces
 * behave identically. The sheet sizes itself to its content (so the scenario, choices, and
 * the "Continue" button are always fully visible without scrolling) — this is only a
 * ceiling, for the rare event whose copy is long enough to actually need it, not a fixed
 * height every event gets stretched or squeezed into. */
export const LIFE_EVENT_SHEET_MAX_HEIGHT_PCT = 0.85;
