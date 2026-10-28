import type { Listing } from './app'
import styles from './app.module.scss'
import { HowItWorks } from './how-it-works'
import { PluginCard } from './plugin-card'

export type PageProps = { listing: Listing; reload: () => Promise<void> }

// The plugins, and what connecting one means.
export const Home = ({ listing, reload }: PageProps) => (
  <>
    <div className={styles.intro}>
      <ol>
        <li>在下面连接插件。</li>
        <li>回到 Gamma Reader，输入框下方会出现它的图标。</li>
        <li>在对话里点亮图标，这个对话的助手就能用它。</li>
      </ol>
      <p>连接信息加密后只存在你的浏览器里，服务器不保存你的任何信息。</p>
    </div>
    <HowItWorks />
    {listing.kind === 'loaded' ? (
      <ul className={styles.list} aria-label="插件">
        {listing.plugins.map(card => (
          <PluginCard key={card.name} card={card} onChange={reload} />
        ))}
      </ul>
    ) : (
      <ListingNote listing={listing} reload={reload} />
    )}
  </>
)

// While the plugin list loads, or after it failed to.
export const ListingNote = ({ listing, reload }: PageProps) => {
  if (listing.kind === 'loading') return <p className={styles.note}>正在读取插件…</p>
  if (listing.kind === 'failed') {
    return (
      <p className={styles.note}>
        插件列表没能读取。
        <button type="button" className={styles.link} onClick={() => void reload()}>
          重试
        </button>
      </p>
    )
  }
  return null
}
