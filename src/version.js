/**
 * 版本信息
 * 版本号在构建时由 vite 从 package.json 注入（见 vite.config.js 的 define）。
 * 直接跑源码（没有构建）时退回下面的兜底值，改版本请只改 package.json。
 */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'

export const REPO_URL = 'https://github.com/Aerdgareo/coinbox'
export const RELEASES_URL = REPO_URL + '/releases'
