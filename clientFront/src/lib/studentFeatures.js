// Enable only alongside the matching database migration and backend feature flag.
export const studentFeatures = {
  detailedAnalytics: import.meta.env.VITE_ENABLE_DETAILED_ANALYTICS === 'true',
}
