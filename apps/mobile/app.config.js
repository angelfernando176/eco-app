// app.json cannot read process.env; this wrapper injects the Google Maps API
// key at config-evaluation time while keeping app.json as the static base.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
})
