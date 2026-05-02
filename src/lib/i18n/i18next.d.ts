import 'i18next'
import type translation from './locales/index'
import type { defaultNS } from './index'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: typeof translation
  }
}
