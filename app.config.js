const { expo } = require('./app.json');

module.exports = {
  expo: {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      eas: {
        projectId: 'a69d0972-659c-41fe-a929-1e3c3012ae6e',
      },
      EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
    },
  },
};
