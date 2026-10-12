/**
 * Questions mark a phrasal verb with **double asterisks** and a gap with ___ .
 * This turns both into something you can see, without pulling in a Markdown library.
 */
export default function RichText({ text }) {
  return text.split(/(\*\*[^*]+\*\*|_{3,})/).map((part, index) => {
    if (/^_{3,}$/.test(part)) return <span key={index} className="gap" aria-label="blank" />
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    return part
  })
}

/** The reply with its gap filled in, the filler in bold: "Could I **have** the salad?" */
export function fillGap(reply, filler) {
  return reply.replace(/_{3,}/, () => `**${filler}**`)
}

/** "Waiter: What can I get you?" -> { speaker: 'Waiter', words: 'What can I get you?' } */
export function splitSpeaker(line) {
  const match = /^([A-Z][\w' .-]{0,24}):\s+(.+)$/.exec(line)
  return match ? { speaker: match[1], words: match[2] } : { speaker: '', words: line }
}
