const { expo } = require('./app.json');

module.exports = {
  expo: {
    ...expo,

    platforms: ['ios', 'android'],

    updates: {
      url: 'https://u.expo.dev/a69d0972-659c-41fe-a929-1e3c3012ae6e',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },

    plugins: [
      [
        '@sentry/react-native',
        {
          organization: process.env.SENTRY_ORG || 'tummy-buddy',
          project: process.env.SENTRY_PROJECT || 'tummy-buddy-app',
        },
      ],
    ],

    extra: {
      ...(expo.extra || {}),
      eas: {
        projectId: 'a69d0972-659c-41fe-a929-1e3c3012ae6e',
      },
      EXPO_PUBLIC_GOOGLE_MAPS_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      SENTRY_DSN: process.env.SENTRY_DSN,
    },
  },
};
