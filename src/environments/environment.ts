/**
 * Runtime configuration for the portfolio site.
 * Edit values here once - they flow into Angular components via DI.
 *
 * For production-only overrides see environment.prod.ts.
 */
export const environment = {
  production: false,

  /** Site identity */
  site: {
    name: 'Ezhilan Veluchami',
    url: 'https://ezhilan-v.github.io'
  },

  /**
   * Google Analytics 4 Measurement ID. Looks like 'G-XXXXXXXXXX'.
   * Replace with your real ID at https://analytics.google.com.
   * Leave as 'G-PLACEHOLDER' to disable - GA stays silent.
   */
  ga: {
    measurementId: 'G-WLRWLEN4NF'
  },

  /**
   * Firebase Realtime Database URL for the visitor map and contact-form
   * messages. Sign up at https://console.firebase.google.com.
   * Leave as '' to fall back to per-browser localStorage.
   *
   * Setup details + security rules: FIREBASE_SETUP.md
   */
  firebase: {
    dbUrl: 'https://my-portfolio-15a9b-default-rtdb.firebaseio.com'
  },

  /**
   * Optional GoatCounter site code for the public on-page visit count.
   * Free at https://www.goatcounter.com. Leave '' to hide the count.
   */
  goatCounter: {
    code: ''
  },

  /** Free geo-IP lookup endpoint used by the visitor-stats card. */
  geo: {
    endpoint: 'https://ipapi.co/json/'
  }
};
