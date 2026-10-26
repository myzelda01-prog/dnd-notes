import { describe, expect, it } from 'vitest'
import { rollDice } from './dice'
import { extractLinks, findBacklinks, matchesQuery, parseTags } from './links'
import { toggleTaskLine } from './tasks'
import type { Note } from './types'

const note = (over: Partial<Note>): Note => ({
  id: 'x', campaignId: 'c', type: 'lore', title: '', body: '', tags: [], fields: {}, created: 0, updated: 0, ...over,
})

describe('links', () => {
  it('extracts normalized, unique link titles', () => {
    expect(extractLinks('Met [[Oswin  Harrow]] and [[oswin harrow]] in [[Brindlemoor]]')).toEqual(['oswin harrow', 'brindlemoor'])
  })

  it('finds notes that mention a note', () => {
    const target = note({ id: 'a', title: 'Brindlemoor' })
    const mentions = note({ id: 'b', body: 'We reached [[brindlemoor]].' })
    const other = note({ id: 'c', body: 'Nothing here' })
    expect(findBacklinks([target, mentions, other], target).map((n) => n.id)).toEqual(['b'])
  })

  it('searches text and #tags', () => {
    const n = note({ title: 'Moonsilver Dagger', tags: ['weapon'], fields: { holder: 'Mira' } })
    expect(matchesQuery(n, 'dagger')).toBe(true)
    expect(matchesQuery(n, 'mira')).toBe(true)
    expect(matchesQuery(n, '#weapon')).toBe(true)
    expect(matchesQuery(n, '#weap')).toBe(false)
  })

  it('parses comma separated tags', () => {
    expect(parseTags(' act-1, #villain,, act-1 ')).toEqual(['act-1', 'villain'])
  })
})

describe('dice', () => {
  it('rolls with modifiers', () => {
    const roll = rollDice('2d6+3', () => 0.5)
    expect(roll).toEqual({ expression: '2d6+3', rolls: [4, 4], modifier: 3, total: 11 })
    expect(rollDice('d20', () => 0.999)?.total).toBe(20)
    expect(rollDice('4d8 - 1', () => 0)?.total).toBe(3)
  })

  it('rejects nonsense', () => {
    expect(rollDice('hello')).toBeNull()
    expect(rollDice('0d6')).toBeNull()
    expect(rollDice('2d1')).toBeNull()
  })
})

describe('tasks', () => {
  it('toggles a checkbox line', () => {
    const body = 'Intro\n- [ ] Search the road\n- [x] Ask Oswin'
    expect(toggleTaskLine(body, 1)).toBe('Intro\n- [x] Search the road\n- [x] Ask Oswin')
    expect(toggleTaskLine(body, 2)).toBe('Intro\n- [ ] Search the road\n- [ ] Ask Oswin')
    expect(toggleTaskLine(body, 0)).toBe(body)
  })
})
