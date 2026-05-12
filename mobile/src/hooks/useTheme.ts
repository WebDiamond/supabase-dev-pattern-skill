// src/hooks/useTheme.ts
import { useColorScheme } from 'react-native'
import { lightTheme, darkTheme, Theme } from '../design/theme'

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme
}
