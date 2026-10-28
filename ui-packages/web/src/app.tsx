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
        <h1>Gamma Reader 插件</h1>
        <p className={styles.intro}>
          {/* Chinese takes no space where a line breaks, so each line is its own string. */}
          {'连接一个插件后，回到 Gamma Reader，对话输入框下方会出现它的图标。'}
          {'在哪个对话里打开它，那个对话的阅读助手就能用它。连接只保存在这个浏览器里。'}
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
      <footer className={styles.note}>
        目前只能在 <a href="https://reader.upivot.io">reader.upivot.io</a> 中使用。
      </footer>
    </main>
  )
}
