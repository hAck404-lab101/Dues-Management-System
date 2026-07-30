'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
const BRANDING_CACHE_KEY = 'branding_cache';
const BRANDING_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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

interface CachedBranding {
    appName: string;
    appLogo: string | null;
    appLogoSecondary: string | null;
    appFavicon: string | null;
    homepageVariant: 'portal' | 'classic';
    ts: number;
}

function getCachedBranding(): CachedBranding | null {
    try {
        const raw = localStorage.getItem(BRANDING_CACHE_KEY);
        if (!raw) return null;
        const data: CachedBranding = JSON.parse(raw);
        if (Date.now() - data.ts > BRANDING_CACHE_TTL) {
            localStorage.removeItem(BRANDING_CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function saveBrandingCache(data: Omit<CachedBranding, 'ts'>) {
    try {
        localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }));
    } catch { /* ignore */ }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const cached = typeof window !== 'undefined' ? getCachedBranding() : null;

    const [appName, setAppName] = useState(cached?.appName ?? cleanBrandText(DEFAULT_APP_NAME));
    const [appLogo, setAppLogo] = useState<string | null>(cached?.appLogo ?? null);
    const [appLogoSecondary, setAppLogoSecondary] = useState<string | null>(cached?.appLogoSecondary ?? null);
    const [appFavicon, setAppFavicon] = useState<string | null>(cached?.appFavicon ?? null);
    const [homepageVariant, setHomepageVariant] = useState<'portal' | 'classic'>(cached?.homepageVariant ?? 'portal');
    const [loading, setLoading] = useState(!cached); // skip loading state if we have cached data
    const fetchedRef = useRef(false);

    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

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
        try {
            const res = await api.get('/settings/public');
            if (res.data.success) {
                const { app_name, app_logo, app_logo_secondary, app_favicon, homepage_variant } = res.data.data;
                const configuredName = cleanBrandText(app_name, DEFAULT_APP_NAME);
                const primaryLogo = app_logo ? formatUrl(app_logo) : null;
                const secondaryLogo = app_logo_secondary ? formatUrl(app_logo_secondary) : null;
                const favicon = app_favicon ? formatUrl(app_favicon) : primaryLogo;
                const variant: 'portal' | 'classic' = homepage_variant === 'classic' ? 'classic' : 'portal';

                setAppName(configuredName);
                if (typeof document !== 'undefined') document.title = configuredName;
                setHomepageVariant(variant);
                setAppLogo(primaryLogo);
                setAppLogoSecondary(secondaryLogo);
                setAppFavicon(favicon);
                applyFavicon(favicon);

                // Save to cache
                saveBrandingCache({
                    appName: configuredName,
                    appLogo: primaryLogo,
                    appLogoSecondary: secondaryLogo,
                    appFavicon: favicon,
                    homepageVariant: variant,
                });
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
            if (typeof document !== 'undefined') document.title = cleanBrandText(DEFAULT_APP_NAME);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        if (cached) {
            // Apply cached favicon immediately
            applyFavicon(cached.appFavicon);
            // Background refresh after a short delay to not compete with critical requests
            setTimeout(fetchBranding, 2000);
        } else {
            fetchBranding();
        }
    }, []);

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
