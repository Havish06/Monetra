
export const theme = {
  colors: {
    background: "#101110",
    surface: "#191C19",
    surfaceElevated: "#222620",
    border: "#2A3029",

    primary: "#C5F277",
    primaryMuted: "#849F50",

    text: "#E8EAE4",
    secondary: "#9A9F95",
    muted: "#686F65",

    warning: "#E7B66D",
    danger: "#E47777",
    success: "#A9D875",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },

  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },

  typography: {
    small: 12,
    body: 14,
    subtitle: 16,
    heading: 22,
    display: 34,
  },
} as const;
