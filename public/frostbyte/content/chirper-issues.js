// content/chirper-issues.js — PURE weekly editions of The Chillmere Chirper (World Plan W1).
// A YYYY-MM-DD key is injected; one issue remains stable from Monday through Sunday.

const DAY_MS = 86_400_000;

export const CHIRPER_ISSUES = Object.freeze([
  Object.freeze({
    id: 'steam-and-string',
    articles: Object.freeze([
      Object.freeze({ title: 'Kettle Claims the Early Shift', body: 'The provisions cart began steaming before its keeper arrived. Three cups have volunteered to investigate.' }),
      Object.freeze({ title: 'Window Display Waves First', body: 'Shoppers report unusually polite merchandise at Snowtail Pet Shop. The window denies everything.' }),
      Object.freeze({ title: 'Trail Lights Defy Explanation', body: 'Brief glints continue along Frostline Trail. Travellers are asked to look closely—and tell this desk what they see.' }),
    ]),
    hint: Object.freeze({ targetId: 'court-fountain-glimmer', text: 'Editor’s hunch: the frozen court keeps one bright thing under its surface.' }),
  }),
  Object.freeze({
    id: 'post-and-powder',
    articles: Object.freeze([
      Object.freeze({ title: 'Postbox Develops a Rattle', body: 'No parcels are missing, but one red box sounds suspiciously pleased with itself.' }),
      Object.freeze({ title: 'Awning Snowfall Highly Local', body: 'A single Court awning released its entire snowcap at noon. The pavement directly beneath has declined comment.' }),
      Object.freeze({ title: 'Workshop Door Finally Unstuck', body: 'Emberlight Workshop is open. Visitors are advised that “do not touch” means Pat has not tested it twice yet.' }),
    ]),
    hint: Object.freeze({ targetId: 'workshop-gizmo-chain', text: 'Editor’s hunch: the busiest shelf in Emberlight does seven things when poked, perhaps eight.' }),
  }),
  Object.freeze({
    id: 'small-noises',
    articles: Object.freeze([
      Object.freeze({ title: 'Chimes Ring Without Wind', body: 'The Bluehour awning chimed twice during a perfect calm. Patrons ordered a third round and waited.' }),
      Object.freeze({ title: 'Patio Mittens Seek Owner', body: 'One violet pair remains beside the late table. They are dry, warm, and almost certainly up to something.' }),
      Object.freeze({ title: 'Harbor Road Surveyed', body: 'Fresh marker posts appeared east of the Court. The route ends at a great deal of snow—for now.' }),
    ]),
    hint: Object.freeze({ targetId: 'workshop-tube-thunk', text: 'Editor’s hunch: the Workshop message tube sounds heavier than an empty pipe.' }),
  }),
  Object.freeze({
    id: 'ice-under-ink',
    articles: Object.freeze([
      Object.freeze({ title: 'Fountain Coin Refuses to Sink', body: 'A brass glimmer has remained beneath the ice all week. No one remembers tossing it.' }),
      Object.freeze({ title: 'Coffee Foam Predicts Flurries', body: 'Today’s Northlight Blend formed a tiny spiral. Snow followed seven minutes later.' }),
      Object.freeze({ title: 'Cobble Choir Gains One Note', body: 'A low hum was heard after closing. The Court watch found no musician and one unusually cold stone.' }),
    ]),
    hint: Object.freeze({ targetId: 'court-wind-chimes', text: 'Editor’s hunch: look above the coffee awning, where the smallest ice pieces catch the breeze.' }),
  }),
]);

function utcDay(todayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey ?? '')) return null;
  const [year, month, day] = todayKey.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms).toISOString().slice(0, 10);
  return parsed === todayKey ? Math.floor(ms / DAY_MS) : null;
}

export function chirperWeekKey(todayKey) {
  const day = utcDay(todayKey);
  if (day == null) return null;
  const dayOfWeek = new Date(day * DAY_MS).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date((day - daysSinceMonday) * DAY_MS).toISOString().slice(0, 10);
}

export function chirperIssueForDate(todayKey) {
  const weekOf = chirperWeekKey(todayKey);
  if (!weekOf) return null;
  const mondayDay = utcDay(weekOf);
  const weekIndex = Math.floor((mondayDay + 3) / 7);
  const template = CHIRPER_ISSUES[((weekIndex % CHIRPER_ISSUES.length) + CHIRPER_ISSUES.length) % CHIRPER_ISSUES.length];
  return {
    id: template.id,
    weekOf,
    articles: template.articles.map((article) => ({ ...article })),
    hint: { ...template.hint },
  };
}
