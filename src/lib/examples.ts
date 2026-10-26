import type { Note, NoteType } from './types'

type Seed = Pick<Note, 'type' | 'title' | 'body'> & { tags?: string[]; fields?: Record<string, string> }

const SEEDS: Seed[] = [
  {
    type: 'session',
    title: 'Session 1: Fog over Brindlemoor',
    fields: { number: '1', played: '2026-10-03', gameDate: '14 Marpenoth' },
    tags: ['act-1'],
    body: `The party arrived in [[Brindlemoor]] on the evening ferry and took rooms at the Lantern & Eel.

## What happened
- [[Oswin Harrow]] asked us to find his brother's missing caravan: [[The Missing Caravan]].
- A hooded stranger was watching from the docks. Mira rolled a 17 on Perception and saw a tattoo of a crown under water.
- We found a [[Moonsilver Dagger]] in the wreck of a fishing boat.

## Loose threads
- Who is the hooded stranger?
- Oswin mentioned the *[[The Drowned Crown]]* and then refused to say more.`,
  },
  {
    type: 'npc',
    title: 'Oswin Harrow',
    fields: { status: 'Alive', attitude: 'Friendly', where: 'Brindlemoor' },
    tags: ['innkeeper'],
    body: `Runs the Lantern & Eel in [[Brindlemoor]]. Nervous, talks fast, overcharges for ale.

His brother Tobin led the caravan that went missing on the coast road.

**Secret (DM):** owes money to the cult of [[The Drowned Crown]].`,
  },
  {
    type: 'location',
    title: 'Brindlemoor',
    fields: { region: 'Sword Coast' },
    tags: ['town'],
    body: `A fishing town built on stilts over a tidal marsh. Thick fog most mornings.

- **Lantern & Eel**: the inn, run by [[Oswin Harrow]]
- **The Old Weir**: flooded ruins east of town, locals avoid it`,
  },
  {
    type: 'quest',
    title: 'The Missing Caravan',
    fields: { status: 'Active', giver: 'Oswin Harrow', reward: '150 gp' },
    tags: ['act-1'],
    body: `Tobin Harrow's caravan never arrived from Leilon. Last seen three days ago on the coast road.

- [ ] Search the coast road
- [ ] Ask at the Old Weir`,
  },
  {
    type: 'loot',
    title: 'Moonsilver Dagger',
    fields: { value: '250', holder: 'Mira', rarity: 'Uncommon' },
    tags: ['weapon'],
    body: `+1 dagger. Glows faintly when undead are within 30 feet. Engraved with a crown under waves, the symbol of [[The Drowned Crown]].`,
  },
  {
    type: 'lore',
    title: 'The Drowned Crown',
    tags: ['cult', 'mystery'],
    body: `A cult that worships a sunken king. Its members tattoo a crown beneath waves on their wrists.

Connected to: [[Oswin Harrow]], [[Moonsilver Dagger]].`,
  },
]

export function exampleNotes(campaignId: string): Note[] {
  const now = Date.now()
  return SEEDS.map((seed, i) => ({
    id: crypto.randomUUID(),
    campaignId,
    type: seed.type as NoteType,
    title: seed.title,
    body: seed.body,
    tags: seed.tags ?? [],
    fields: seed.fields ?? {},
    created: now - (SEEDS.length - i) * 60_000,
    updated: now - (SEEDS.length - i) * 60_000,
  }))
}
