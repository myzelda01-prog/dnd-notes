import type { ReactNode } from 'react'
import { normalizeTitle } from '../lib/links'
import type { Note } from '../lib/types'

interface Props {
  body: string
  titleIndex: Map<string, Note>
  onOpenLink: (title: string, target: Note | undefined) => void
  onToggleTask: (lineIndex: number) => void
}

const INLINE_RE = /(\[\[[^[\]]+?\]\]|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g

function renderInline(text: string, props: Props, keyPrefix: string): ReactNode[] {
  return text.split(INLINE_RE).map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const title = part.slice(2, -2).trim()
      const target = props.titleIndex.get(normalizeTitle(title))
      return (
        <button
          key={key}
          type="button"
          className={target ? `wikilink type-${target.type}` : 'wikilink missing'}
          title={target ? `Open ${target.title}` : `Create a note called "${title}"`}
          onClick={() => props.onOpenLink(title, target)}
        >
          {title}
        </button>
      )
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{renderInline(part.slice(2, -2), props, key)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{renderInline(part.slice(1, -1), props, key)}</em>
    }
    return part
  })
}

type Block =
  | { kind: 'heading'; level: number; text: string; line: number }
  | { kind: 'para'; lines: { text: string; line: number }[] }
  | { kind: 'list'; items: { text: string; line: number; task: null | boolean }[] }

function parseBlocks(body: string): Block[] {
  const blocks: Block[] = []
  body.split('\n').forEach((raw, line) => {
    const heading = raw.match(/^(#{1,3})\s+(.*)$/)
    const item = raw.match(/^\s*[-*]\s+(.*)$/)
    const last = blocks[blocks.length - 1]
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2], line })
    } else if (item) {
      const task = item[1].match(/^\[( |x|X)\]\s*(.*)$/)
      const entry = task ? { text: task[2], line, task: task[1] !== ' ' } : { text: item[1], line, task: null }
      if (last?.kind === 'list') last.items.push(entry)
      else blocks.push({ kind: 'list', items: [entry] })
    } else if (raw.trim() === '') {
      blocks.push({ kind: 'para', lines: [] })
    } else if (last?.kind === 'para') {
      last.lines.push({ text: raw, line })
    } else {
      blocks.push({ kind: 'para', lines: [{ text: raw, line }] })
    }
  })
  return blocks.filter((b) => b.kind !== 'para' || b.lines.length > 0)
}

export function NoteBody(props: Props) {
  const blocks = parseBlocks(props.body)
  if (blocks.length === 0) return <p className="muted">Nothing written yet. Choose Edit to add notes.</p>
  return (
    <div className="prose">
      {blocks.map((block, i) => {
        if (block.kind === 'heading') {
          const content = renderInline(block.text, props, `h${i}`)
          return block.level === 1 ? <h2 key={i}>{content}</h2> : <h3 key={i}>{content}</h3>
        }
        if (block.kind === 'list') {
          return (
            <ul key={i} className={block.items.some((it) => it.task !== null) ? 'tasks' : undefined}>
              {block.items.map((item) => (
                <li key={item.line} className={item.task ? 'done' : undefined}>
                  {item.task !== null && (
                    <input
                      type="checkbox"
                      checked={item.task}
                      aria-label="Mark done"
                      onChange={() => props.onToggleTask(item.line)}
                    />
                  )}
                  <span>{renderInline(item.text, props, `li${item.line}`)}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {block.lines.map((l, j) => (
              <span key={l.line}>
                {j > 0 && <br />}
                {renderInline(l.text, props, `p${l.line}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

