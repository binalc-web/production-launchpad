import type { Mixpanel as MixpanelType } from 'mixpanel-browser';
import type { MixpanelEventProperties } from './mixpanelEventProperties';

const MIXPANEL_PROJECT_TOKEN = import.meta.env.VITE_MIXPANEL_PROJECT_TOKEN;
const isProduction = import.meta.env.VITE_ENVIRONMENT === 'prod';

let mixpanel: MixpanelType | null = null;
let mixpanelInitPromise: Promise<MixpanelType> | null = null;

export const initMixpanel = async (): Promise<MixpanelType> => {
  if (mixpanel) {
    return mixpanel;
  }
  if (!mixpanelInitPromise) {
    mixpanelInitPromise = (async (): Promise<MixpanelType> => {
      const { default: mixpanelBrowser } = await import('mixpanel-browser');
      const token = MIXPANEL_PROJECT_TOKEN;

      if (!token) {
        throw new Error('Mixpanel token is not defined');
      }

       
      mixpanelBrowser.init(token, {
        debug: !isProduction,
        // eslint-disable-next-line camelcase
        track_pageview: true,
      });
      mixpanel = mixpanelBrowser;
      return mixpanel;
    })();
  }
  return mixpanelInitPromise;
};

export const identifyUser = async (userId: string): Promise<void> => {
  const mixpanelInstance = await initMixpanel();
  mixpanelInstance.identify(userId);
};

export const trackEvent = async (
  eventName: string,
  properties?: MixpanelEventProperties
): Promise<void> => {
  const mixpanelInstance = await initMixpanel();
  const { pathname, search } = window.location;
  mixpanelInstance.track(eventName, {
    page: pathname,
    query: search,
    ...properties,
    environment: isProduction ? 'prod' : 'dev',
  });
};
