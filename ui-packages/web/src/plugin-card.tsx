import type { PluginCard as Card, PluginStatus } from '@gamma-reader-plug/shared/plugins'
import { useState } from 'react'
import { Link } from 'react-router'
import { post } from './api'
import styles from './app.module.scss'
import { connectors } from './plugins'

type PluginCardProps = { card: Card; onChange: () => Promise<void>; detailLink?: boolean }

// One plugin: what it does, whether this browser has it connected, and the way to change that.
export const PluginCard = ({ card, onChange, detailLink = true }: PluginCardProps) => {
  const connector = connectors[card.name]
  const [error, setError] = useState<string>()
  const disconnect = async () => {
    setError(undefined)
    try {
      await post(`/api/${card.name}/disconnect`)
      await onChange()
    } catch (cause) {
      console.error('Unable to disconnect', cause)
      setError(cause instanceof Error ? cause.message : '断开失败')
    }
  }
  const { status } = card
  const disconnected = status.kind === 'disconnected' || status.kind === 'invalid'

  return (
    <li className={styles.card}>
      <img className={styles.icon} src={card.icon} alt="" />
      <div className={styles.body}>
        <h2>{card.title}</h2>
        <p>{card.summary}</p>
        <p className={styles.status} data-kind={status.kind}>
          <StatusLine status={status} />
        </p>
        {status.kind === 'connected' && connector?.revokeHint && (
          <p className={styles.hint}>{connector.revokeHint}</p>
        )}
        {detailLink && (
          <Link className={styles.detailLink} to={`/${card.name}`}>
            详情
          </Link>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.actions}>
        {disconnected && connector && (
          <connector.Connect
            label={status.kind === 'invalid' ? '重新连接' : '连接'}
            onConnected={onChange}
          />
        )}
        {!disconnected && (
          <button type="button" onClick={() => void disconnect()}>
            断开
          </button>
        )}
      </div>
    </li>
  )
}

const StatusLine = ({ status }: { status: PluginStatus }) => {
  if (status.kind === 'disconnected') return '未连接'
  if (status.kind === 'invalid') return 'API Key 已失效'
  if (status.kind === 'connected') return '已连接'
  if (status.kind === 'needs_membership') {
    return (
      <>
        需要开通会员，
        <a href={status.membershipUrl} target="_blank" rel="noopener">
          去开通
        </a>
      </>
    )
  }
  return `暂时无法确认：${status.message}`
}
