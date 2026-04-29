/**
 * Production-mode runtime configuration. Angular's `fileReplacements` swaps
 * `environment.ts` for this file in prod builds, so this MUST be standalone -
 * importing from `./environment` would resolve back to this file (self-import)
 * and produce a TDZ error at runtime.
 *
 * Keep values in sync with `environment.ts`. Only `production` should differ.
 */
export const environment = {
  production: true,

  site: {
    name: 'Ezhilan Veluchami',
    url: 'https://ezhilan-v.github.io'
  },

  ga: {
    measurementId: 'G-WLRWLEN4NF'
  },

  firebase: {
    dbUrl: 'https://my-portfolio-15a9b-default-rtdb.firebaseio.com'
  },

  goatCounter: {
    code: ''
  },

  geo: {
    endpoint: 'https://ipapi.co/json/'
  }
};
