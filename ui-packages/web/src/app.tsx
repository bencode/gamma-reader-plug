import type { PluginCard as Card } from '@gamma-reader-plug/shared/plugins'
import { useCallback, useEffect, useState } from 'react'
import { loadPlugins } from './api'
import styles from './app.module.scss'
import { PluginCard } from './plugin-card'

type Listing = { kind: 'loading' } | { kind: 'loaded'; plugins: Card[] } | { kind: 'failed' }

export const App = () => {
  const [listing, setListing] = useState<Listing>({ kind: 'loading' })
  const reload = useCallback(async (signal?: AbortSignal) => {
    try {
      setListing({ kind: 'loaded', plugins: await loadPlugins(signal) })
    } catch (cause) {
      if (signal?.aborted) return
      console.error('Unable to load the plugins', cause)
      setListing({ kind: 'failed' })
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void reload(controller.signal)
    return () => controller.abort()
  }, [reload])

  return (
    <main className={styles.page}>
      <header>
        <div className={styles.titleRow}>
          <h1>Gamma Reader 插件</h1>
          <a
            className={styles.source}
            href="https://github.com/bencode/gamma-reader-plug"
            target="_blank"
            rel="noopener"
          >
            <GitHubMark />
            GitHub
          </a>
        </div>
        <p className={styles.intro}>
          {/* Chinese takes no space where a line breaks, so each line is its own string. */}
          {'连接一个插件后，回到 Gamma Reader，对话输入框下方会出现它的图标。'}
          {'在哪个对话里打开它，那个对话的阅读助手就能用它。连接只保存在这个浏览器里，'}
          {'服务器不保存任何与你相关的东西。'}
        </p>
      </header>
      {listing.kind === 'loading' && <p className={styles.note}>正在读取插件…</p>}
      {listing.kind === 'failed' && (
        <p className={styles.note}>
          插件列表没能读取。
          <button type="button" className={styles.link} onClick={() => void reload()}>
            重试
          </button>
        </p>
      )}
      {listing.kind === 'loaded' && (
        <ul className={styles.list}>
          {listing.plugins.map(card => (
            <PluginCard key={card.name} card={card} onChange={reload} />
          ))}
        </ul>
      )}
    </main>
  )
}

// GitHub's mark, which the icon set no longer carries.
const GitHubMark = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
  </svg>
)
