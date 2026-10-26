/** Flip the checkbox on one line of a body: "- [ ]" <-> "- [x]". */
export function toggleTaskLine(body: string, lineIndex: number): string {
  const lines = body.split('\n')
  const line = lines[lineIndex]
  if (line === undefined) return body
  lines[lineIndex] = line.replace(/^(\s*[-*]\s+)\[( |x|X)\]/, (_m, lead: string, mark: string) => `${lead}[${mark === ' ' ? 'x' : ' '}]`)
  return lines.join('\n')
}
