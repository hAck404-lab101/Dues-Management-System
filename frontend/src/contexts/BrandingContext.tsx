'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface BrandingContextType {
    appName: string;
    appLogo: string | null;
    appLogoSecondary: string | null;
    appFavicon: string | null;
    loading: boolean;
    refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const [appName, setAppName] = useState('UCC Dues');
    const [appLogo, setAppLogo] = useState<string | null>(null);
    const [appLogoSecondary, setAppLogoSecondary] = useState<string | null>(null);
    const [appFavicon, setAppFavicon] = useState<string | null>(null);
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
                const { app_name, app_logo, app_logo_secondary, app_favicon } = res.data.data;

                if (app_name) {
                    setAppName(app_name);
                    if (typeof document !== 'undefined') document.title = app_name;
                }

                if (app_logo) setAppLogo(formatUrl(app_logo));
                if (app_logo_secondary) setAppLogoSecondary(formatUrl(app_logo_secondary));

                if (app_favicon) {
                    const fullFavicon = formatUrl(app_favicon);
                    setAppFavicon(fullFavicon);

                    // Update favicon in DOM
                    if (typeof document !== 'undefined' && fullFavicon) {
                        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
                        if (link) {
                            link.href = fullFavicon;
                        } else {
                            const newLink = document.createElement('link');
                            newLink.rel = 'icon';
                            newLink.href = fullFavicon;
                            document.head.appendChild(newLink);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load branding:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranding();
    }, []);

    return (
        <BrandingContext.Provider value={{
            appName,
            appLogo,
            appLogoSecondary,
            appFavicon,
            loading,
            refreshBranding: fetchBranding
        }}>
            {children}
        </BrandingContext.Provider>
    );
}

export function useBranding() {
    const context = useContext(BrandingContext);
    if (context === undefined) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
}
