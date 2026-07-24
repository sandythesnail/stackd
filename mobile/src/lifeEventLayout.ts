/** Shared between the post-lesson life-event sheet (app/sheet/life-event.tsx) and the
 * mid-lesson ambient variant (AmbientLifeEventModal in app/learn/quest.tsx) so both
 * surfaces occupy the exact same fraction of the screen every time, regardless of a given
 * event's copy length — content that doesn't fit scrolls internally instead of the sheet
 * itself growing or shrinking trigger to trigger. */
export const LIFE_EVENT_SHEET_HEIGHT_PCT = 0.55;
