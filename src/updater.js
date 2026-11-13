/**
 * 检查更新 / 打开外链
 * 只依赖 GitHub 的公开 release 接口，不需要任何 key。
 */
import { RELEASES_URL } from './version.js'

const API = 'https://api.github.com/repos/Aerdgareo/coinbox/releases/latest'

export const CHECK_TIMEOUT = 8000

/** 打开外部链接：Electron 会交给系统浏览器（主进程拦了 window.open） */
export function openExternal(url) {
  try {
    window.open(url, '_blank', 'noopener')
  } catch (e) {
    // 被拦了就退回一层
    try {
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      setTimeout(function () {
        if (a.parentNode) a.parentNode.removeChild(a)
      }, 800)
    } catch (e2) {}
  }
}

/** a > b 返回 1，相等 0，a < b 返回 -1 */
export function compareVersions(a, b) {
  const pa = String(a || '0').replace(/^v/i, '').split('.')
  const pb = String(b || '0').replace(/^v/i, '').split('.')
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = parseInt(pa[i], 10) || 0
    const y = parseInt(pb[i], 10) || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

/**
 * 拉最新 release。
 * 超时 / 无网络 / 接口报错 都会 reject，调用方按 error.message 区分：
 * 'timeout' | 'unsupported' | 'http-xxx' | 其他
 */
export function checkLatestRelease(timeoutMs) {
  return new Promise(function (resolve, reject) {
    if (typeof fetch !== 'function') {
      reject(new Error('unsupported'))
      return
    }

    let settled = false
    let controller = null
    try {
      if (typeof AbortController === 'function') controller = new AbortController()
    } catch (e) {}

    const timer = setTimeout(function () {
      if (settled) return
      settled = true
      if (controller) {
        try {
          controller.abort()
        } catch (e) {}
      }
      reject(new Error('timeout'))
    }, timeoutMs || CHECK_TIMEOUT)

    const opts = {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    }
    if (controller) opts.signal = controller.signal

    fetch(API, opts)
      .then(function (res) {
        if (!res.ok) throw new Error('http-' + res.status)
        return res.json()
      })
      .then(function (data) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve({
          latest: String((data && (data.tag_name || data.name)) || '').replace(/^v/i, ''),
          url: (data && data.html_url) || RELEASES_URL,
          name: (data && data.name) || '',
          published: (data && data.published_at) || ''
        })
      })
      .catch(function (e) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        reject(e || new Error('unknown'))
      })
  })
}
