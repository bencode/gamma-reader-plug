import { createHash } from 'node:crypto'
import { z } from 'zod'
import { defineTool } from '../../plugin.js'
import { type GetnoteCredential, getnote } from './client.js'
import { type NoteDetail, noteMarkdown } from './note-markdown.js'

type NoteSummary = {
  note_id: string
  title: string
  note_type: string
  preview?: { text?: string }
  created_at?: string
}
type NotePage = {
  notes: NoteSummary[]
  has_more: boolean
  cursor?: string
  pagination?: { next_cursor?: string | null }
}

const pageSize = 20
const savedTag = 'Gamma Reader'
const topicId = z
  .string()
  .min(1)
  .describe('A knowledge base, as getnote_list_knowledge_bases returns its topic_id.')

const summary = (note: NoteSummary) => ({
  note_id: note.note_id,
  title: note.title,
  preview: note.preview?.text ?? '',
  note_type: note.note_type,
  created_at: note.created_at,
})

// Reading and searching the user's notes, and adding new ones; nothing here edits or deletes.
export const getnoteTools = (plugOrigin: string) => [
  defineTool({
    name: 'getnote_search',
    description:
      "Search the user's 得到大脑 notes by meaning, across all of them or within one knowledge base. Returns up to top_k excerpts; partial means some results were left out. Read a note in full with getnote_read_note.",
    input: z.object({
      query: z.string().min(1).max(500),
      topic_id: topicId.optional(),
      top_k: z.number().int().min(1).max(10).optional(),
    }),
    run: async (input, credential: GetnoteCredential) => {
      const data = await getnote<{
        results: {
          note_id?: string
          note_type: string
          title: string
          content: string
          created_at?: string
        }[]
        partial?: boolean
      }>(plugOrigin, credential, 'POST', input.topic_id ? 'recall/knowledge' : 'recall', input)
      return {
        results: data.results.map(result => ({
          note_id: result.note_id,
          title: result.title,
          snippet: result.content,
          type: result.note_type,
          created_at: result.created_at,
        })),
        partial: data.partial ?? false,
      }
    },
  }),
  defineTool({
    name: 'getnote_list_knowledge_bases',
    description:
      "List the user's 得到大脑 knowledge bases, optionally those whose name matches query. Follow page while has_more is true.",
    input: z.object({
      query: z.string().min(1).optional(),
      page: z.number().int().min(1).optional(),
    }),
    run: async (input, credential: GetnoteCredential) => {
      const data = await getnote<{
        topics: {
          topic_id: string
          name: string
          description?: string
          stats?: { note_count?: number }
        }[]
        has_more: boolean
      }>(plugOrigin, credential, 'GET', 'knowledge/list', { ...input, page_size: pageSize })
      return {
        knowledge_bases: data.topics.map(topic => ({
          topic_id: topic.topic_id,
          name: topic.name,
          description: topic.description ?? '',
          note_count: topic.stats?.note_count,
        })),
        has_more: data.has_more,
      }
    },
  }),
  defineTool({
    name: 'getnote_list_notes',
    description:
      "List the user's 得到大脑 notes, newest first, with a short preview each: all notes, following next_cursor, or one knowledge base's, following next_page. Read a note in full with getnote_read_note.",
    input: z.object({
      topic_id: topicId.optional(),
      cursor: z.string().optional().describe('next_cursor from the previous page of all notes.'),
      page: z.number().int().min(1).optional().describe('A page of a knowledge base, from 1.'),
    }),
    run: async (input, credential: GetnoteCredential) => {
      if (input.topic_id) {
        const page = input.page ?? 1
        const data = await getnote<NotePage>(plugOrigin, credential, 'GET', 'knowledge/notes', {
          topic_id: input.topic_id,
          page,
          page_size: pageSize,
        })
        return { notes: data.notes.map(summary), next_page: data.has_more ? page + 1 : null }
      }
      const data = await getnote<NotePage>(plugOrigin, credential, 'GET', 'note/list', {
        cursor: input.cursor,
        page_size: pageSize,
      })
      const next = data.pagination?.next_cursor ?? data.cursor
      return { notes: data.notes.map(summary), next_cursor: data.has_more ? next : null }
    },
  }),
  defineTool({
    name: 'getnote_read_note',
    description:
      "Read one 得到大脑 note in full as Markdown: a highlight with the user's comment, a saved page, or a recording's transcript.",
    input: z.object({ note_id: z.string().min(1) }),
    run: async (input, credential: GetnoteCredential) => {
      const { note } = await getnote<{ note: NoteDetail }>(
        plugOrigin,
        credential,
        'GET',
        'note/detail',
        {
          id: input.note_id,
        },
      )
      return {
        note_id: note.note_id,
        title: note.title,
        markdown: noteMarkdown(note),
        tags: note.tags?.map(tag => tag.name) ?? [],
        source_url: note.reference?.url ?? note.web_page?.url,
      }
    },
  }),
  defineTool({
    name: 'getnote_save_note',
    description: `Save a new note to the user's 得到大脑, only when the user asks for it. content is Markdown. It is tagged "${savedTag}"; topic_id puts it in a knowledge base. Notes are only ever added, never changed or deleted.`,
    input: z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      topic_id: topicId.optional(),
      tags: z.array(z.string().min(1)).max(10).optional(),
    }),
    run: async (input, credential: GetnoteCredential) => {
      // The same note sent twice, such as on a retry, is saved once.
      const idempotencyKey = createHash('sha256')
        .update(JSON.stringify([credential.apiKey, input.title, input.content]))
        .digest('hex')
        .slice(0, 32)
      const data = await getnote<{ note_id: string }>(
        plugOrigin,
        credential,
        'POST',
        'note/save',
        {
          note_type: 'plain_text',
          title: input.title,
          content: input.content,
          tags: [...new Set([...(input.tags ?? []), savedTag])],
          topic_id: input.topic_id,
        },
        { 'Idempotency-Key': idempotencyKey },
      )
      return { note_id: data.note_id }
    },
  }),
]
