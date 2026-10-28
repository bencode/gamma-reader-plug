// The fields of note/detail that hold a note's text; which ones do depends on its type.
export type NoteDetail = {
  note_id: string
  title: string
  note_type: string
  // A highlight's comment for a ref note; the text itself otherwise.
  content?: string
  // The highlighted passage of a ref note.
  ref_content?: string
  web_page?: { content?: string; url?: string }
  audio?: { original?: string }
  tags?: { name: string }[]
  reference?: { title?: string; url?: string }
}

// One Markdown text for the model: a highlight is quoted with its comment after it; a link note
// and a recording add the page or the transcript; the source closes it.
export const noteMarkdown = (note: NoteDetail) => {
  const body =
    note.note_type === 'ref'
      ? [note.ref_content && quote(note.ref_content), note.content]
      : [note.content, note.web_page?.content, note.audio?.original]
  const sourceUrl = note.reference?.url ?? note.web_page?.url
  const source = sourceUrl
    ? `Source: [${note.reference?.title ?? sourceUrl}](${sourceUrl})`
    : note.reference?.title && `Source: ${note.reference.title}`
  return [...body, source]
    .map(part => part?.trim())
    .filter(Boolean)
    .join('\n\n')
}

const quote = (text: string) =>
  text
    .trim()
    .split('\n')
    .map(line => `> ${line}`.trimEnd())
    .join('\n')
