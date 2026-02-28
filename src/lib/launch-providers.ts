/**
 * Launch provider social media mappings.
 * Used by /api/events and /api/live to enrich event data with stream and social links.
 */

/** YouTube channel IDs indexed by launch provider / agency name */
export const PROVIDER_YOUTUBE_CHANNEL_IDS: Record<string, string> = {
  'SpaceX': 'UCtI0Hodo5o5dUb67FeUjDeA',
  'NASA': 'UCLA_DiR1FfKNvjuUpBHmylQ',
  'Blue Origin': 'UCVxTHEKKLxNjGcvVaZindlg',
  'Rocket Lab': 'UCsWq7LZaizhIi-c-Yo_bgg',
  'ULA': 'UCVrEnvMzkT9oAXUELMfUiuQ',
  'Arianespace': 'UCRn9F2D4J-K6n8QxBSt9szw',
  'ISRO': 'UC57528Rl_WicpAtQrFCa3Dg',
  'Roscosmos': 'UCOcpUgXosMCIlOsreUfNFiA',
  'JAXA': 'UCfn8daq0FRGMAbficghxQQg',
  'Relativity Space': 'UCsmhLVaB0vq1ixmyGq4m51A',
  'Firefly Aerospace': 'UCE7cLxjl3p_r0fVa-9aJ0jw',
  'Virgin Orbit': 'UCMrzjIq0vaKWCTBc4hkOhzA',
  'Northrop Grumman': 'UC57528Rl_WicpAtQrFCa3Dg',
  'Astra': 'UCnHXMRsaHv_kNmyFqMi4Wdg',
  'ABL Space Systems': '',
  'Stoke Space': '',
};

/** Full YouTube channel URLs indexed by launch provider / agency name */
export const PROVIDER_YOUTUBE_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_YOUTUBE_CHANNEL_IDS)
    .filter(([, id]) => id)
    .map(([provider, id]) => [provider, `https://www.youtube.com/channel/${id}/live`])
);

/** X (Twitter) handles indexed by launch provider / agency name */
export const PROVIDER_X_HANDLES: Record<string, string> = {
  'SpaceX': 'SpaceX',
  'NASA': 'NASA',
  'Blue Origin': 'blueorigin',
  'Rocket Lab': 'RocketLab',
  'ULA': 'ulalaunch',
  'Arianespace': 'Arianespace',
  'ISRO': 'isaborbit',
  'Roscosmos': 'roscosmos',
  'JAXA': 'JAXA_en',
  'Relativity Space': 'relataborbit',
  'Firefly Aerospace': 'FireflySpace',
  'Virgin Orbit': 'VirginOrbit',
  'Northrop Grumman': 'northaborbit',
  'Astra': 'Aaborbit',
  'ABL Space Systems': 'ablspacesys',
  'Stoke Space': 'StokeSaborbit',
};

/** Full X.com profile URLs indexed by launch provider / agency name */
export const PROVIDER_X_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(PROVIDER_X_HANDLES)
    .filter(([, handle]) => handle)
    .map(([provider, handle]) => [provider, `https://x.com/${handle}`])
);
