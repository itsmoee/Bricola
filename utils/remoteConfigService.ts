import { useState, useEffect } from 'react';
import { remoteConfig, analytics } from '../firebase';
import { fetchAndActivate, getString, getBoolean } from 'firebase/remote-config';
import { logEvent } from 'firebase/analytics';

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
    loaded: false,
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

                // Log one exposure event per experiment so Firebase Analytics can track variant distribution
                analytics.then(a => {
                    if (!a) return;
                    logEvent(a, 'ab_test_exposure', { experiment: 'onboarding_style', variant: onboardingStyle });
                    logEvent(a, 'ab_test_exposure', { experiment: 'cta_label_style', variant: ctaLabelStyle });
                    logEvent(a, 'ab_test_exposure', { experiment: 'browse_sort_default', variant: browseSortDefault });
                });
            })
            .catch(() => {
                // Fetch failed — keep defaults active
                setValues(prev => ({ ...prev, loaded: true }));
            });
    }, []);

    return values;
}