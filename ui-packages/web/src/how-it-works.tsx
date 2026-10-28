import styles from './app.module.scss'

const source = (path: string) => `https://github.com/bencode/gamma-reader-plug/blob/main/${path}`

// Where a plugin's credential and content go, the same for every plugin, with the code to check it.
export const HowItWorks = () => (
  <details className={styles.howItWorks}>
    <summary>工作原理</summary>
    <ol className={styles.flow}>
      <li>
        <strong>你的浏览器</strong>
        <span>cookie 里是加密后的凭据</span>
      </li>
      <li>
        <strong>插件服务器</strong>
        <span>在内存里解开，替你调用，请求结束就丢掉</span>
      </li>
      <li>
        <strong>对应的服务</strong>
        <span>比如得到大脑</span>
      </li>
    </ol>
    <table>
      <tbody>
        <tr>
          <th>你连接插件用的凭据</th>
          <td>加密后在你浏览器的 cookie 里，400 天有效，每次使用自动续期</td>
        </tr>
        <tr>
          <th>解开 cookie 的密钥</th>
          <td>在服务器配置里，所有人共用一把，不对应任何用户</td>
        </tr>
        <tr>
          <th>笔记等内容</th>
          <td>只在调用时经过服务器，不保存，也不写进日志</td>
        </tr>
        <tr>
          <th>你的账号、身份、使用记录</th>
          <td>不存在：服务器没有账号体系，也没有数据库</td>
        </tr>
      </tbody>
    </table>
    <ul>
      <li>断开只清除这个浏览器里的连接；要让凭据彻底失效，到对应的服务那边删掉它。</li>
      <li>换浏览器或设备，要重新连接一次。</li>
      <li>
        凭据通常有你账号的全部权限，请像对待密码一样对待它；助手能做什么，看每个插件下面的工具清单。
      </li>
      <li>
        代码全部公开，可以自己核对，也可以自己部署一份：
        <a href={source('web-packages/server/src/sealed.ts')} target="_blank" rel="noopener">
          凭据怎么加密
        </a>
        {'、'}
        <a
          href={source('web-packages/server/src/plugins/getnote/client.ts')}
          target="_blank"
          rel="noopener"
        >
          日志只记什么
        </a>
        {'、'}
        <a
          href="https://github.com/bencode/gamma-reader-plug#how-it-works"
          target="_blank"
          rel="noopener"
        >
          完整说明和时序图
        </a>
        。
      </li>
    </ul>
  </details>
)
