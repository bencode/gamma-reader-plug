import type { PluginCard as Card } from '@gamma-reader-plug/shared/plugins'
import { Fragment } from 'react'
import { Link, useParams } from 'react-router'
import styles from './app.module.scss'
import { ListingNote, type PageProps } from './home'
import { PluginCard } from './plugin-card'
import { connectors, type ServiceApi } from './plugins'

// One plugin: its connection, and which of its service's APIs it uses.
export const PluginPage = ({ listing, reload }: PageProps) => {
  const { name } = useParams()
  const card =
    listing.kind === 'loaded' ? listing.plugins.find(item => item.name === name) : undefined
  const apis = card && connectors[card.name]?.apis
  return (
    <>
      <Link className={styles.back} to="/">
        ← 全部插件
      </Link>
      {listing.kind !== 'loaded' && <ListingNote listing={listing} reload={reload} />}
      {listing.kind === 'loaded' && !card && <p className={styles.note}>没有这个插件。</p>}
      {card && (
        <>
          <ul className={styles.list} aria-label="插件">
            <PluginCard card={card} onChange={reload} detailLink={false} />
          </ul>
          {apis && <ApiTable service={apis.service} list={apis.list} tools={card.tools} />}
        </>
      )}
    </>
  )
}

type ApiTableProps = { service: string; list: readonly ServiceApi[]; tools: Card['tools'] }

// An API counts as used when a tool the server actually offers calls it.
const ApiTable = ({ service, list, tools }: ApiTableProps) => {
  const offered = new Set(tools)
  const callers = (api: ServiceApi) => api.tools?.filter(tool => offered.has(tool)) ?? []
  const groups = [...new Set(list.map(api => api.group))]
  return (
    <section className={styles.apis}>
      <h2>{service}相关 API</h2>
      <table>
        <thead>
          <tr>
            <th>接口</th>
            <th>读写</th>
            <th>已接入</th>
          </tr>
        </thead>
        {groups.map(group => (
          <tbody key={group}>
            <tr className={styles.group}>
              <th colSpan={3} scope="colgroup">
                {group}
              </th>
            </tr>
            {list
              .filter(api => api.group === group)
              .map(api => (
                <tr key={api.path}>
                  <td>
                    <code>
                      {`${api.method} `}
                      {breakable(api.path)}
                    </code>
                    <div>{api.description}</div>
                  </td>
                  <td>{api.access}</td>
                  <td>
                    {callers(api).length > 0 ? (
                      <>
                        <span>✓ </span>
                        {callers(api).map(tool => (
                          <code key={tool}>{tool}</code>
                        ))}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </section>
  )
}

// A path that may wrap only after a slash.
const breakable = (path: string) =>
  path.split('/').map((part, index, parts) => (
    <Fragment key={parts.slice(0, index + 1).join('/')}>
      {part}
      {index < parts.length - 1 && (
        <>
          /<wbr />
        </>
      )}
    </Fragment>
  ))
