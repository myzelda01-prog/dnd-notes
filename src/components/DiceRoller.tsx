import { useState } from 'react'
import { rollDice, type DiceRoll } from '../lib/dice'

export function DiceRoller() {
  const [expression, setExpression] = useState('d20')
  const [result, setResult] = useState<DiceRoll | null>(null)
  const [error, setError] = useState(false)

  const roll = () => {
    const r = rollDice(expression)
    setError(!r)
    setResult(r)
  }

  return (
    <form className="dice" onSubmit={(e) => { e.preventDefault(); roll() }}>
      <label htmlFor="dice-expr" className="visually-hidden">Dice to roll</label>
      <input
        id="dice-expr"
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        aria-invalid={error}
        title="Try d20, 2d6+3 or 4d8-1"
      />
      <button type="submit" className="btn">Roll</button>
      <output className="dice-result" aria-live="polite" title={result ? `Rolls: ${result.rolls.join(', ')}` : undefined}>
        {error ? 'Try 2d6+3' : result ? result.total : ''}
      </output>
    </form>
  )
}
