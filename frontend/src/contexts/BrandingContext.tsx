'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface BrandingContextType {
    appName: string;
    appLogo: string | null;
    appLogoSecondary: string | null;
    appFavicon: string | null;
    homepageVariant: 'portal' | 'classic';
    loading: boolean;
    refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);
const DEFAULT_APP_NAME = process.env.NEXT_PUBLIC_DEFAULT_APP_NAME || 'Dues Management System';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [appName, setAppName] = useState(DEFAULT_APP_NAME);
    const [appLogo, setAppLogo] = useState<string | null>(null);
    const [appLogoSecondary, setAppLogoSecondary] = useState<string | null>(null);
    const [appFavicon, setAppFavicon] = useState<string | null>(null);
    const [homepageVariant, setHomepageVariant] = useState<'portal' | 'classic'>('portal');
    const [loading, setLoading] = useState(true);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api').replace('/api', '');

    const formatUrl = (url: string | null) => {
        if (!url) return null;
        return url.startsWith('/') ? `${API_BASE}${url}` : url;
    };

    const fetchBranding = async () => {
        try {
            const res = await api.get('/settings/public');
            if (res.data.success) {
                const { app_name, app_logo, app_logo_secondary, app_favicon, homepage_variant } = res.data.data;
                const configuredName = app_name?.trim() || DEFAULT_APP_NAME;

                setAppName(configuredName);
                if (typeof document !== 'undefined') document.title = configuredName;

                setHomepageVariant(homepage_variant === 'classic' ? 'classic' : 'portal');
                setAppLogo(app_logo ? formatUrl(app_logo) : null);
                setAppLogoSecondary(app_logo_secondary ? formatUrl(app_logo_secondary) : null);

                if (app_favicon) {
                    const fullFavicon = formatUrl(app_favicon);
                    setAppFavicon(fullFavicon);
                    if (typeof document !== 'undefined' && fullFavicon) {
                        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                        if (link) link.href = fullFavicon;
                        else {
                            const newLink = document.createElement('link');
                            newLink.rel = 'icon';
                            newLink.href = fullFavicon;
                            document.head.appendChild(newLink);
                        }
                    }
                } else {
                    setAppFavicon(null);
                }
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
            if (typeof document !== 'undefined') document.title = DEFAULT_APP_NAME;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBranding(); }, []);

    return (
        <BrandingContext.Provider value={{ appName, appLogo, appLogoSecondary, appFavicon, homepageVariant, loading, refreshBranding: fetchBranding }}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    const context = useContext(BrandingContext);
    if (context === undefined) throw new Error('useBranding must be used within a BrandingProvider');
    return context;
}
