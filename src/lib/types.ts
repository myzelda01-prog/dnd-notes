export type NoteType = 'session' | 'npc' | 'location' | 'quest' | 'loot' | 'lore'

export interface FieldDef {
  key: string
  label: string
  kind: 'text' | 'number' | 'select'
  options?: string[]
}

export interface TypeDef {
  label: string
  singular: string
  fields: FieldDef[]
}

export const NOTE_TYPES: Record<NoteType, TypeDef> = {
  session: {
    label: 'Sessions',
    singular: 'Session',
    fields: [
      { key: 'number', label: 'Session #', kind: 'number' },
      { key: 'played', label: 'Played on', kind: 'text' },
      { key: 'gameDate', label: 'In-game date', kind: 'text' },
    ],
  },
  npc: {
    label: 'NPCs',
    singular: 'NPC',
    fields: [
      { key: 'status', label: 'Status', kind: 'select', options: ['Alive', 'Dead', 'Missing', 'Unknown'] },
      { key: 'attitude', label: 'Attitude', kind: 'select', options: ['Friendly', 'Neutral', 'Hostile', 'Unknown'] },
      { key: 'where', label: 'Found at', kind: 'text' },
    ],
  },
  location: {
    label: 'Locations',
    singular: 'Location',
    fields: [{ key: 'region', label: 'Region', kind: 'text' }],
  },
  quest: {
    label: 'Quests',
    singular: 'Quest',
    fields: [
      { key: 'status', label: 'Status', kind: 'select', options: ['Active', 'Completed', 'Failed', 'On hold'] },
      { key: 'giver', label: 'Quest giver', kind: 'text' },
      { key: 'reward', label: 'Reward', kind: 'text' },
    ],
  },
  loot: {
    label: 'Loot',
    singular: 'Item',
    fields: [
      { key: 'value', label: 'Value (gp)', kind: 'number' },
      { key: 'holder', label: 'Carried by', kind: 'text' },
      { key: 'rarity', label: 'Rarity', kind: 'select', options: ['Common', 'Uncommon', 'Rare', 'Very rare', 'Legendary', 'Artifact'] },
    ],
  },
  lore: {
    label: 'Lore',
    singular: 'Lore',
    fields: [],
  },
}

export const TYPE_ORDER: NoteType[] = ['session', 'npc', 'location', 'quest', 'loot', 'lore']

export interface Campaign {
  id: string
  name: string
  created: number
}

export interface Note {
  id: string
  campaignId: string
  type: NoteType
  title: string
  body: string
  tags: string[]
  fields: Record<string, string>
  created: number
  updated: number
}

export function isNoteType(value: unknown): value is NoteType {
  return typeof value === 'string' && value in NOTE_TYPES
}
