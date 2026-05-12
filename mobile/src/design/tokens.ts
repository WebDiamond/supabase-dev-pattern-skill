// src/design/tokens.ts
import { Platform } from 'react-native'

export const palette = {
  primary500: '#6351F5', primary400: '#7B6BFF', primary300: '#9A8DFF',
  primary100: '#DDD8FF', primary900: '#171254',
  neutral0: '#FFFFFF', neutral50: '#F8F8FC', neutral100: '#EFEFF5',
  neutral200: '#DDDDE8', neutral400: '#9494A4', neutral500: '#6E6E80',
  neutral700: '#2E2E3A', neutral800: '#1A1A24', neutral900: '#0F0F14',
  success: '#22C55E', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
}

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48, xxxl:64 } as const
export const radius  = { sm:6, md:12, lg:16, xl:24, full:9999 } as const

export const fontSize = {
  xs:11, sm:13, md:15, lg:17, xl:20, xxl:24, xxxl:30, display:38,
} as const

export const fontWeight = {
  regular:'400', medium:'500', semibold:'600', bold:'700', black:'900',
} as const

export const lineHeight = { tight:1.2, normal:1.5, loose:1.75 } as const

export const shadow = {
  sm: Platform.select({ ios: { shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4 }, android:{elevation:2} }),
  md: Platform.select({ ios: { shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.10, shadowRadius:12 }, android:{elevation:6} }),
  lg: Platform.select({ ios: { shadowColor:'#6351F5', shadowOffset:{width:0,height:8}, shadowOpacity:0.20, shadowRadius:24 }, android:{elevation:12} }),
} as const
