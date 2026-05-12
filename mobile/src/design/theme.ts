// src/design/theme.ts
import { palette, spacing, radius, fontSize, fontWeight, lineHeight, shadow } from './tokens'
export type Theme = typeof lightTheme

export const lightTheme = {
  colors: {
    background: palette.neutral50, backgroundElevated: palette.neutral0,
    surface: palette.neutral0, surfaceSecondary: palette.neutral100,
    primary: palette.primary500, primaryLight: palette.primary100,
    textPrimary: palette.neutral900, textSecondary: palette.neutral500,
    textDisabled: palette.neutral400, textInverse: palette.neutral0,
    textBrand: palette.primary500,
    border: palette.neutral200, borderFocus: palette.primary500,
    success: palette.success, warning: palette.warning, error: palette.error, info: palette.info,
    inputBackground: palette.neutral100, inputBorder: palette.neutral200,
    inputBorderFocus: palette.primary500, inputPlaceholder: palette.neutral400,
  },
  spacing, radius, fontSize, fontWeight, lineHeight, shadow,
}

export const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: palette.neutral900, backgroundElevated: palette.neutral800,
    surface: palette.neutral800, surfaceSecondary: palette.neutral700,
    primary: palette.primary400, primaryLight: palette.primary900,
    textPrimary: palette.neutral50, textSecondary: palette.neutral400,
    textDisabled: palette.neutral700, textInverse: palette.neutral900,
    textBrand: palette.primary400,
    border: palette.neutral700, borderFocus: palette.primary400,
    inputBackground: palette.neutral800, inputBorder: palette.neutral700,
    inputBorderFocus: palette.primary400, inputPlaceholder: palette.neutral500,
  },
}
