const { expo } = require('./app.json');

module.exports = {
  expo: {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
    },
  },
};
