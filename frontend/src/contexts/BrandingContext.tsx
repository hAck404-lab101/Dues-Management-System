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
const DEFAULT_APP_NAME = process.env.NEXT_PUBLIC_DEFAULT_APP_NAME || 'DuesPay';

const cleanBrandText = (value?: string | null, fallback = DEFAULT_APP_NAME) => {
    const text = String(value || fallback || '').trim();
    if (!text) return fallback;
    return text
        .replace(/University of Cape Coast/gi, 'DuesPay')
        .replace(/\bUCC\b/gi, 'DuesPay')
        .replace(/Ho Technical University/gi, 'DuesPay')
        .replace(/\bHTU\b/gi, 'DuesPay')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [appName, setAppName] = useState(cleanBrandText(DEFAULT_APP_NAME));
    const [appLogo, setAppLogo] = useState<string | null>(null);
    const [appLogoSecondary, setAppLogoSecondary] = useState<string | null>(null);
    const [appFavicon, setAppFavicon] = useState<string | null>(null);
    const [homepageVariant, setHomepageVariant] = useState<'portal' | 'classic'>('portal');
    const [loading, setLoading] = useState(true);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api').replace(/\/api\/?$/, '');

    const formatUrl = (url: string | null) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return url.startsWith('/') ? `${API_BASE}${url}` : `${API_BASE}/${url}`;
    };

    const applyFavicon = (href: string | null) => {
        if (typeof document === 'undefined' || !href) return;
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = href;
    };

    const fetchBranding = async () => {
        setLoading(true);
        try {
            const res = await api.get('/settings/public', {
                params: { _t: Date.now() },
                headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
            });
            if (res.data.success) {
                const { app_name, app_logo, app_logo_secondary, app_favicon, homepage_variant } = res.data.data;
                const configuredName = cleanBrandText(app_name, DEFAULT_APP_NAME);
                const primaryLogo = app_logo ? formatUrl(app_logo) : null;
                const secondaryLogo = app_logo_secondary ? formatUrl(app_logo_secondary) : null;
                const favicon = app_favicon ? formatUrl(app_favicon) : primaryLogo;

                setAppName(configuredName);
                if (typeof document !== 'undefined') document.title = configuredName;

                setHomepageVariant(homepage_variant === 'classic' ? 'classic' : 'portal');
                setAppLogo(primaryLogo);
                setAppLogoSecondary(secondaryLogo);
                setAppFavicon(favicon);
                applyFavicon(favicon);
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
            if (typeof document !== 'undefined') document.title = cleanBrandText(DEFAULT_APP_NAME);
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
