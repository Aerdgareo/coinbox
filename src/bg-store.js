/**
 * 背景图仓库：IndexedDB 存二进制，读的时候生成 objectURL
 *
 * 为什么不用 localStorage：配额按字符算（约 5M），base64 还要膨胀 33%，
 * 一张 1440px 的 JPEG 就吃 8%~13%，八张左右就满。IndexedDB 直接存 Blob，
 * 零膨胀、配额按磁盘算，几百张也没问题。
 *
 * 三个 store：
 *   meta    索引 { id, name, addedAt, size }，列表先读这个，不碰图片本身
 *   blobs   全尺寸 JPEG
 *   thumbs  列表用的 360px 缩略图
 */

const DB_NAME = 'coinbox-bg'
const DB_VER = 1

const S_META = 'meta'
const S_BLOB = 'blobs'
const S_THUMB = 'thumbs'

let dbPromise = null

function reqP(req) {
  return new Promise(function (resolve, reject) {
    req.onsuccess = function () { resolve(req.result) }
    req.onerror = function () { reject(req.error || new Error('request-failed')) }
  })
}

function txDone(t) {
  return new Promise(function (resolve, reject) {
    t.oncomplete = function () { resolve() }
    t.onerror = function () { reject(t.error || new Error('tx-failed')) }
    t.onabort = function () { reject(t.error || new Error('tx-aborted')) }
  })
}

export function openDB() {
  if (dbPromise) return dbPromise
  if (typeof indexedDB === 'undefined' || !indexedDB) {
    return Promise.reject(new Error('no-indexeddb'))
  }
  dbPromise = new Promise(function (resolve, reject) {
    let req
    try {
      req = indexedDB.open(DB_NAME, DB_VER)
    } catch (e) {
      reject(e)
      return
    }
    req.onupgradeneeded = function () {
      const db = req.result
      if (!db.objectStoreNames.contains(S_META)) db.createObjectStore(S_META, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(S_BLOB)) db.createObjectStore(S_BLOB)
      if (!db.objectStoreNames.contains(S_THUMB)) db.createObjectStore(S_THUMB)
    }
    req.onsuccess = function () {
      const db = req.result
      // 别的标签页要升级时及时让路，否则会一直 blocked
      db.onversionchange = function () {
        try { db.close() } catch (e) {}
        dbPromise = null
      }
      resolve(db)
    }
    req.onerror = function () { reject(req.error || new Error('open-failed')) }
    req.onblocked = function () { reject(new Error('blocked')) }
  }).catch(function (e) {
    dbPromise = null
    throw e
  })
  return dbPromise
}

/** 能否用 IndexedDB（打不开就退回 localStorage 老路） */
export async function probe() {
  try {
    await openDB()
    return true
  } catch (e) {
    return false
  }
}

export async function getAllMeta() {
  const db = await openDB()
  const t = db.transaction(S_META, 'readonly')
  const all = await reqP(t.objectStore(S_META).getAll())
  const arr = Array.isArray(all) ? all : []
  arr.sort(function (a, b) {
    return (a.addedAt || 0) - (b.addedAt || 0)
  })
  return arr
}

export async function getBlob(id) {
  const db = await openDB()
  const t = db.transaction(S_BLOB, 'readonly')
  const v = await reqP(t.objectStore(S_BLOB).get(id))
  return v || null
}

export async function getThumb(id) {
  const db = await openDB()
  const t = db.transaction(S_THUMB, 'readonly')
  const v = await reqP(t.objectStore(S_THUMB).get(id))
  return v || null
}

/** 一条记录（索引 + 大图 + 缩略图）在一个事务里写，不会出现只有一半的情况 */
export async function putBg(item) {
  if (!item || !item.id || !item.blob) return false
  const db = await openDB()
  const t = db.transaction([S_META, S_BLOB, S_THUMB], 'readwrite')
  t.objectStore(S_META).put({
    id: item.id,
    name: item.name || '',
    addedAt: item.addedAt || Date.now(),
    size: item.size || item.blob.size || 0
  })
  t.objectStore(S_BLOB).put(item.blob, item.id)
  t.objectStore(S_THUMB).put(item.thumb || item.blob, item.id)
  await txDone(t)
  return true
}

export async function delBg(id) {
  const db = await openDB()
  const t = db.transaction([S_META, S_BLOB, S_THUMB], 'readwrite')
  t.objectStore(S_META).delete(id)
  t.objectStore(S_BLOB).delete(id)
  t.objectStore(S_THUMB).delete(id)
  await txDone(t)
  return true
}

export async function clearAll() {
  const db = await openDB()
  const t = db.transaction([S_META, S_BLOB, S_THUMB], 'readwrite')
  t.objectStore(S_META).clear()
  t.objectStore(S_BLOB).clear()
  t.objectStore(S_THUMB).clear()
  await txDone(t)
  return true
}

/** 申请持久化，免得系统清磁盘时把背景图一起回收 */
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return !!(await navigator.storage.persist())
    }
  } catch (e) {}
  return false
}

export async function storageInfo() {
  const out = { usage: 0, quota: 0, persisted: false }
  try {
    if (navigator.storage && navigator.storage.persisted) {
      out.persisted = !!(await navigator.storage.persisted())
    }
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate()
      out.usage = e.usage || 0
      out.quota = e.quota || 0
    }
  } catch (e) {}
  return out
}

/* ---------------- base64 ↔ Blob ---------------- */

/** 手写解码，比 fetch(dataURL) 稳（file:// 下也能用） */
export function dataUrlToBlob(dataUrl) {
  const s = String(dataUrl || '')
  const comma = s.indexOf(',')
  if (comma < 0) return null
  const head = s.slice(0, comma)
  const body = s.slice(comma + 1)
  const m = head.match(/data:([^;]+)/)
  const mime = (m && m[1]) || 'image/jpeg'
  try {
    if (head.indexOf('base64') < 0) {
      return new Blob([decodeURIComponent(body)], { type: mime })
    }
    const bin = atob(body)
    const len = bin.length
    const buf = new Uint8Array(len)
    for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i)
    return new Blob([buf], { type: mime })
  } catch (e) {
    return null
  }
}

export function blobToDataUrl(blob) {
  return new Promise(function (resolve, reject) {
    if (!blob) {
      resolve('')
      return
    }
    const fr = new FileReader()
    fr.onload = function () { resolve(String(fr.result || '')) }
    fr.onerror = function () { reject(fr.error || new Error('read-failed')) }
    fr.readAsDataURL(blob)
  })
}
