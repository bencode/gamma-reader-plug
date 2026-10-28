import type { ConnectStart, PollResult } from '@gamma-reader-plug/shared/plugins'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { post } from '../../api'
import styles from '../../app.module.scss'
import type { ConnectProps } from '../index'

type Phase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'waiting'; start: ConnectStart }
  | { kind: 'expired' }
  | { kind: 'failed'; message: string }

const message = (cause: unknown) => (cause instanceof Error ? cause.message : '连接失败')

// Device-code authorization: the user confirms on 得到大脑's page while this one polls.
export const GetnoteConnect = ({ label, onConnected }: ConnectProps) => {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const start = async () => {
    setPhase({ kind: 'starting' })
    try {
      const response = await post('/api/getnote/connect')
      setPhase({ kind: 'waiting', start: await response.json() })
    } catch (cause) {
      console.error('Unable to start connecting', cause)
      setPhase({ kind: 'failed', message: message(cause) })
    }
  }

  useEffect(() => {
    if (phase.kind !== 'waiting') return
    const controller = new AbortController()
    const delay = phase.start.interval * 1000
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const response = await post('/api/getnote/connect/poll', controller.signal)
        const { status }: PollResult = await response.json()
        if (status === 'pending') timer = setTimeout(poll, delay)
        else if (status === 'connected') await onConnected()
        else setPhase({ kind: 'expired' })
      } catch (cause) {
        if (controller.signal.aborted) return
        console.error('Unable to check the authorization', cause)
        setPhase({ kind: 'failed', message: message(cause) })
      }
    }
    timer = setTimeout(poll, delay)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [phase, onConnected])

  if (phase.kind === 'waiting') {
    return (
      <div className={styles.connect}>
        <a
          className={styles.primary}
          href={phase.start.verificationUri}
          target="_blank"
          rel="noopener"
        >
          去得到大脑授权
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        <p>
          核对码 <code>{phase.start.userCode}</code>，授权后这里会自动更新。
        </p>
        <button type="button" onClick={() => setPhase({ kind: 'idle' })}>
          取消
        </button>
      </div>
    )
  }
  return (
    <div className={styles.connect}>
      {phase.kind === 'expired' && <p>授权码已过期。</p>}
      {phase.kind === 'failed' && <p className={styles.error}>{phase.message}</p>}
      <button
        type="button"
        className={styles.primary}
        disabled={phase.kind === 'starting'}
        onClick={() => void start()}
      >
        {phase.kind === 'idle' || phase.kind === 'starting' ? label : '重新连接'}
      </button>
    </div>
  )
}
