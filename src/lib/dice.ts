export interface DiceRoll {
  expression: string
  rolls: number[]
  modifier: number
  total: number
}

const DICE_RE = /^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i

/**
 * Roll a dice expression like "d20", "2d6+3" or "4d8 - 1".
 * Returns null when the expression is not valid.
 */
export function rollDice(expression: string, random: () => number = Math.random): DiceRoll | null {
  const match = expression.trim().match(DICE_RE)
  if (!match) return null
  const count = match[1] ? Number(match[1]) : 1
  const sides = Number(match[2])
  const modifier = match[3] ? Number(match[3].replace(/\s+/g, '')) : 0
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null
  const rolls = Array.from({ length: count }, () => Math.floor(random() * sides) + 1)
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier
  return { expression: expression.trim(), rolls, modifier, total }
}
