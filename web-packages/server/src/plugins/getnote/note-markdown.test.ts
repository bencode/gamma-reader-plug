import { describe, expect, it } from 'vitest'
import { noteMarkdown } from './note-markdown.js'

const note = { note_id: '1', title: 'A note' }

describe('note Markdown', () => {
  it('takes the text each kind of note keeps, and closes with its source', () => {
    expect(
      noteMarkdown({
        ...note,
        note_type: 'ref',
        ref_content: 'The first line\nThe second line',
        content: 'My comment',
        reference: { title: 'A book', url: 'https://example.org/book' },
      }),
    ).toBe(
      '> The first line\n> The second line\n\nMy comment\n\nSource: [A book](https://example.org/book)',
    )
    expect(
      noteMarkdown({
        ...note,
        note_type: 'link',
        content: 'Why I kept it',
        web_page: { content: 'The page', url: 'https://example.org/page' },
      }),
    ).toBe(
      'Why I kept it\n\nThe page\n\nSource: [https://example.org/page](https://example.org/page)',
    )
    expect(
      noteMarkdown({ ...note, note_type: 'recorder_audio', audio: { original: 'Transcript' } }),
    ).toBe('Transcript')
    expect(noteMarkdown({ ...note, note_type: 'plain_text', content: 'Plain text' })).toBe(
      'Plain text',
    )
  })
})
