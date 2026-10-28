import { ExternalLink } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { post } from '../../api'
import styles from '../../app.module.scss'
import type { ConnectProps } from '../index'

type Phase = { kind: 'idle' } | { kind: 'form'; error?: string } | { kind: 'saving' }

// The user's own application and API Key, made on 得到大脑's open platform; the server checks them
// once and keeps them sealed in this browser.
export const GetnoteConnect = ({ label, onConnected }: ConnectProps) => {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPhase({ kind: 'saving' })
    try {
      await post('/api/getnote/connect', {
        clientId: String(form.get('clientId') ?? ''),
        apiKey: String(form.get('apiKey') ?? ''),
      })
      await onConnected()
    } catch (cause) {
      console.error('Unable to connect', cause)
      setPhase({ kind: 'form', error: cause instanceof Error ? cause.message : '连接失败' })
    }
  }

  if (phase.kind === 'idle') {
    return (
      <button type="button" className={styles.primary} onClick={() => setPhase({ kind: 'form' })}>
        {label}
      </button>
    )
  }
  return (
    <form className={styles.keyForm} onSubmit={event => void submit(event)}>
      <p>
        在得到大脑开放平台的「应用管理」创建一个个人开发应用，再到「API Key」页为它创建 Key。
        <a href="https://www.biji.com/openapi" target="_blank" rel="noopener">
          去开放平台
          <ExternalLink size={13} aria-hidden="true" />
        </a>
      </p>
      <label>
        Client ID
        <input name="clientId" required autoComplete="off" spellCheck={false} placeholder="cli_…" />
      </label>
      <label>
        API Key
        <input
          name="apiKey"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="gk_live_…"
        />
      </label>
      <p className={styles.hint}>
        建议单独为 Reader 建一个 Key，以后不想用了，到得到大脑删掉它即可。
      </p>
      {phase.kind === 'form' && phase.error && <p className={styles.error}>{phase.error}</p>}
      <div className={styles.formActions}>
        <button type="button" onClick={() => setPhase({ kind: 'idle' })}>
          取消
        </button>
        <button type="submit" className={styles.primary} disabled={phase.kind === 'saving'}>
          {phase.kind === 'saving' ? '正在验证…' : '连接'}
        </button>
      </div>
    </form>
  )
}
