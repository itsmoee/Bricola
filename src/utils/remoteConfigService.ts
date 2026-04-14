import { useState, useEffect } from 'react';
import { remoteConfig, analytics } from '../firebase';
import { fetchAndActivate, getString, getBoolean } from 'firebase/remote-config';

export type OnboardingStyle = 'wizard' | 'single_page';
export type CtaLabelStyle = 'post' | 'find';
export type BrowseSortDefault = 'rating' | 'proximity';

export interface RemoteConfigValues {
  onboardingStyle: OnboardingStyle;
  ctaLabelStyle: CtaLabelStyle;
  browseSortDefault: BrowseSortDefault;
  ramadanPromoEnabled: boolean;
  loaded: boolean;
}

const DEFAULTS: RemoteConfigValues = {
  onboardingStyle: 'wizard',
  ctaLabelStyle: 'post',
  browseSortDefault: 'rating',
  ramadanPromoEnabled: false,
  loaded: false
};

export function useRemoteConfig(): RemoteConfigValues {
  const [values, setValues] = useState<RemoteConfigValues>(DEFAULTS);

  useEffect(() => {
    fetchAndActivate(remoteConfig)
      .then(() => {
        const onboardingStyle =
          (getString(remoteConfig, 'onboarding_style') as OnboardingStyle) || 'wizard';
        const ctaLabelStyle =
          (getString(remoteConfig, 'cta_label_style') as CtaLabelStyle) || 'post';
        const browseSortDefault =
          (getString(remoteConfig, 'browse_sort_default') as BrowseSortDefault) || 'rating';
        const ramadanPromoEnabled = getBoolean(remoteConfig, 'ramadan_promo_enabled');

        setValues({ onboardingStyle, ctaLabelStyle, browseSortDefault, ramadanPromoEnabled, loaded: true });
      })
      .catch(() => {
        setValues(prev => ({ ...prev, loaded: true }));
      });
  }, []);

  // Analytics is null by default in this Expo migration.
  void analytics;
  return values;
}
