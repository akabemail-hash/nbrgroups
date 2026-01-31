
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { Session, User, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { UserProfile, Permission, AppContextType, AppPermission, Language, Translations, Notification, UserNotification, ActiveVisit } from '../types';
import { App } from '@capacitor/app';

// Import translations from JS files directly to avoid bare specifier/JSON module issues
import en from '../locales/en.js';
import az from '../locales/az.js';
import tr from '../locales/tr.js';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

// Timeout duration for initial data fetching (in milliseconds)
// Increased to 60 seconds to handle cold starts or slow networks better.
const INITIAL_FETCH_TIMEOUT = 60000;

// Inactivity timeout duration (10 minutes)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [permissions, setPermissions] = useState<Record<string, AppPermission>>({});

    const [sessionLoading, setSessionLoading] = useState(true);
    // Translations are now imported synchronously, so no loading state is needed for them.
    const [translationsLoading] = useState(false);
    const loading = sessionLoading || translationsLoading;

    const [error, setError] = useState<string | null>(null);
    
    const [language, setLanguageState] = useState<Language>(() => {
        const savedLang = localStorage.getItem('app-lang');
        return (savedLang === 'en' || savedLang === 'az' || savedLang === 'tr') ? savedLang : 'en';
    });
    
    const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
        const savedTheme = localStorage.getItem('app-theme');
        if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    // Navigation state
    const [activePage, setActivePage] = useState<string>('/');
    const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

    // Notifications state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
    const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);
    const [activeReadingNotification, setActiveReadingNotification] = useState<UserNotification | null>(null);
    
    const [passwordRecoveryRequired, setPasswordRecoveryRequired] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const notificationsChannelRef = useRef<RealtimeChannel | null>(null);
    
    // Active Visit State
    const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(() => {
        const stored = localStorage.getItem('active-visit');
        return stored ? JSON.parse(stored) : null;
    });

    const startVisit = useCallback((customer: { id: string, name: string }) => {
        const newVisit: ActiveVisit = {
            customerId: customer.id,
            customerName: customer.name,
            startTime: Date.now(),
            isSaved: false
        };
        setActiveVisit(newVisit);
        localStorage.setItem('active-visit', JSON.stringify(newVisit));
    }, []);

    const markVisitAsSaved = useCallback((visitId: string) => {
        setActiveVisit(prev => {
            if (!prev) return null;
            const updated = { ...prev, isSaved: true, visitId };
            localStorage.setItem('active-visit', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const endVisit = useCallback(() => {
        setActiveVisit(null);
        localStorage.removeItem('active-visit');
    }, []);
    
    // Ref to track which user's data is currently loaded to prevent redundant fetches
    const loadedUserIdRef = useRef<string | null>(null);

    // Translations logic
    // Using explicit casts to compatible types to avoid TypeScript index signature issues
    const [translations] = useState<Record<Language, Translations>>({
        en: en as unknown as Translations,
        az: az as unknown as Translations,
        tr: tr as unknown as Translations
    });

    const t = useCallback((key: string): string => {
        if (!translations) return key;
        const langTranslations = translations[language];
        return langTranslations?.[key] || translations.en[key] || key;
    }, [language, translations]);
    
    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);
    
    // Theme logic
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'light' ? 'dark' : 'light');
    };
    
    // Language logic
    const setLanguage = useCallback((lang: string) => {
        if (lang === 'en' || lang === 'az' || lang === 'tr') {
            setLanguageState(lang as Language);
            localStorage.setItem('app-lang', lang);
        }
    }, []);
    
    // Navigation logic with History Support
    const navigateTo = useCallback((page: string) => {
        if (activePage === page) return;
        setNavigationHistory(prev => [...prev, activePage]);
        setActivePage(page);
    }, [activePage]);

    // Handle Hardware Back Button
    const historyRef = useRef<string[]>(navigationHistory);
    useEffect(() => {
        historyRef.current = navigationHistory;
    }, [navigationHistory]);

    useEffect(() => {
        let backButtonListener: any;

        const handleBackButton = () => {
            // If there is history, go back one step
            if (historyRef.current.length > 0) {
                setNavigationHistory(prev => {
                    const newHist = [...prev];
                    const prevPage = newHist.pop();
                    if (prevPage) setActivePage(prevPage);
                    return newHist;
                });
            } else {
                // If no history (root), exit the app
                App.exitApp();
            }
        };

        const setupListener = async () => {
            try {
                // Add the listener and store the handle for cleanup
                backButtonListener = await App.addListener('backButton', handleBackButton);
            } catch (e) {
                console.warn('App plugin listeners setup failed (likely running in browser)', e);
            }
        };
        
        setupListener();

        return () => {
            if (backButtonListener) {
                backButtonListener.remove();
            }
        };
    }, []);
    
    // Notification logic
    const dismissNotification = useCallback((id: number | string) => {
        setNotifications(prev => prev.filter(n => n.id !== String(id)));
    }, []);

    const showNotification = useCallback((message: string, type: Notification['type'] = 'info', options: { onClick?: () => void; duration?: number, id?: string | number } = {}) => {
        const id = options.id ? String(options.id) : String(Date.now());
        const newNotification: Notification = { 
            id, 
            message, 
            type, 
            onClick: options.onClick,
            created_at: new Date().toISOString()
        };
        setNotifications(prev => [...prev.filter(n => n.id !== id), newNotification]);
        
        const duration = options.duration || 5000;
        setTimeout(() => {
            dismissNotification(id);
        }, duration);
    }, [dismissNotification]);

    // Logout
    const logout = useCallback(async () => {
        await supabase.auth.signOut();
        // Clear refs and state manually here as well to ensure immediate UI update
        loadedUserIdRef.current = null;
        setProfile(null);
        setSession(null);
        setActiveVisit(null);
        localStorage.removeItem('active-visit');
        setNavigationHistory([]); // Clear history on logout
        setActivePage('/'); // Directly set page, avoiding navigateTo which pushes history
    }, []);

    // Manual Refresh capability exposed to UI
    const refreshSession = useCallback(async () => {
        setSessionLoading(true);
        const { error } = await supabase.auth.refreshSession();
        if (error) {
            showNotification("Failed to refresh session. Please login again.", "error");
            logout();
        }
        // The onAuthStateChange listener will handle the success case
    }, [logout, showNotification]);

    // User notifications logic
    const unreadCount = useMemo(() => userNotifications.filter(n => !n.is_read).length, [userNotifications]);

    const markNotificationAsRead = useCallback(async (id: string) => {
        const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
        if (error) {
            showNotification(`Error marking notification as read: ${error.message}`, 'error');
        } else {
            setUserNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        }
    }, [showNotification]);
    
    const markAllNotificationsAsRead = useCallback(async () => {
        const unreadIds = userNotifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;
        const { error } = await supabase.from('user_notifications').update({ is_read: true }).in('id', unreadIds);
        if (error) {
            showNotification(`Error marking all as read: ${error.message}`, 'error');
        } else {
            setUserNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    }, [userNotifications, showNotification]);

    // --- Inactivity Auto-Logout Logic ---
    useEffect(() => {
        // Only run inactivity timer if there is an active session
        if (!session) return;

        let inactivityTimer: ReturnType<typeof setTimeout>;

        // Function to reset the timer
        const resetInactivityTimer = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                console.log("User inactive for 10 minutes. Logging out.");
                logout();
                showNotification("Session expired due to inactivity.", "info");
            }, INACTIVITY_TIMEOUT);
        };

        // Throttle event listeners to avoid performance impact
        let lastActivityTime = 0;
        const handleUserActivity = () => {
            const now = Date.now();
            if (now - lastActivityTime > 1000) { // Limit resets to once per second
                resetInactivityTimer();
                lastActivityTime = now;
            }
        };

        // Initialize timer
        resetInactivityTimer();

        // Listen for user interaction
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('mousedown', handleUserActivity);
        window.addEventListener('keypress', handleUserActivity);
        window.addEventListener('touchmove', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        // Cleanup
        return () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('mousedown', handleUserActivity);
            window.removeEventListener('keypress', handleUserActivity);
            window.removeEventListener('touchmove', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
        };
    }, [session, logout, showNotification]);


    // Main auth and profile effect
    useEffect(() => {
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            // Handle Sign Out explicitly
            if (event === 'SIGNED_OUT') {
                loadedUserIdRef.current = null;
                setProfile(null);
                setPermissions({});
                setUserNotifications([]);
                setLogoUrl(null);
                setSession(null);
                setUser(null);
                setSessionLoading(false);
                setNavigationHistory([]);
                setActiveVisit(null);
                localStorage.removeItem('active-visit');
                if (notificationsChannelRef.current) {
                    supabase.removeChannel(notificationsChannelRef.current);
                    notificationsChannelRef.current = null;
                }
                return;
            }

            // Always update session state to ensure it have the latest token
            // IMPORTANT: If event is TOKEN_REFRESHED, we just update the session reference and return.
            // We do NOT want to trigger a loading screen or re-fetch profile data.
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'TOKEN_REFRESHED') {
                return;
            }
            
            if (event === 'PASSWORD_RECOVERY') {
                setPasswordRecoveryRequired(true);
            }

            // CRITICAL FIX: Smart Data Loading
            // If we have a session, check if we've already loaded data for this user ID.
            if (session?.user?.id && loadedUserIdRef.current === session.user.id) {
                // Data is already loaded.
                return;
            }

            // Proceed with full data fetch for initial session or NEW login
            setSessionLoading(true);
            setError(null);

            // Cleanup previous realtime subscriptions if user changed
            if (notificationsChannelRef.current) {
                supabase.removeChannel(notificationsChannelRef.current);
                notificationsChannelRef.current = null;
            }
    
            if (session?.user) {
                // Initialize a timeout to prevent infinite loading.
                const timeoutId = setTimeout(() => {
                    if (mounted) {
                        console.error("Initial data fetch timed out.");
                        setSessionLoading(false);
                        setError("Connection timed out. Please check your internet connection.");
                        showNotification("Connection slow. Failed to load profile data.", "error");
                    }
                }, INITIAL_FETCH_TIMEOUT);

                try {
                    // --- CRITICAL PATH START: Fetch essential data ---
                    const profilePromise = supabase.from('users').select('*, role:user_roles(*)').eq('id', session.user.id).single();
                    const settingsPromise = supabase.from('settings').select('value').eq('key', 'app_logo_url').single();
    
                    const [{ data: profileData, error: profileError }, { data: logoData, error: logoError }] = await Promise.all([profilePromise, settingsPromise]);
    
                    if (profileError) throw profileError;
                    // Ignore specific error for missing logo setting
                    if (logoError && logoError.code !== 'PGRST116') throw logoError;
    
                    if (mounted) {
                        setProfile(profileData as UserProfile | null);
                        setLogoUrl(logoData?.value || null);
                        
                        // Mark this user's data as loaded
                        loadedUserIdRef.current = session.user.id;
        
                        if (profileData?.role_id) {
                            const { data: permsData, error: permsError } = await supabase.from('user_permissions').select('*').eq('role_id', profileData.role_id);
                            if (permsError) throw permsError;
                            const permsMap = (permsData || []).reduce((acc, p) => { acc[p.page_name] = p; return acc; }, {} as Record<string, AppPermission>);
                            setPermissions(permsMap);
                        } else {
                            setPermissions({});
                        }

                        // Determine default landing page based on role
                        const roleName = (profileData as any)?.role?.name;
                        const roletypesa = (profileData as any)?.role?.typesa;
                        // For admins (or undefined roles), default to dashboard '/'.
                        // For any other role (e.g. Seller, Merch), default to Sales Dashboard '/sales-dashboard'.
                        if (roleName && roleName !== 'Admin') {
                            setActivePage('/sales-dashboard');
                            setNavigationHistory(['/sales-dashboard']);
                        } else {
                             setActivePage('/');
                             setNavigationHistory(['/']);
                        }
                    }
                    // --- CRITICAL PATH END ---
    
                    // --- NON-CRITICAL PATH: Fetch notifications ---
                    (async () => {
                        try {
                            if (!profileData?.id || !mounted) return;
    
                            const { data: notifData, error: notifError } = await supabase
                                .from('user_notifications')
                                .select('*, notification:notifications(*, creator:users(full_name))')
                                .eq('user_id', session.user.id)
                                .order('created_at', { foreignTable: 'notification', ascending: false });
                            
                            if (notifError) throw notifError;
                            if (mounted) setUserNotifications((notifData as any) || []);
    
                            const channel = supabase.channel(`user-notifications:${session.user.id}`);
                            channel
                                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${session.user.id}` }, async (payload) => {
                                    const { data: newNotifData } = await supabase
                                        .from('user_notifications')
                                        .select('*, notification:notifications(*, creator:users(full_name))')
                                        .eq('id', payload.new.id)
                                        .single();
                                    
                                    if (newNotifData && mounted) {
                                        setUserNotifications(prev => [newNotifData as any, ...prev]);
                                        
                                        // Handle link in notification popup
                                        const notificationLink = newNotifData.notification.link;
                                        const onClick = notificationLink 
                                            ? () => window.open(notificationLink, '_blank')
                                            : undefined;
                                            
                                        showNotification(
                                            `${tRef.current('notifications.newNotificationFrom')} ${newNotifData.notification.creator?.full_name || 'System'}`, 
                                            'message', 
                                            { id: newNotifData.id, onClick }
                                        );
                                    }
                                })
                                .subscribe((status, err) => {
                                    if (status === 'SUBSCRIBED') console.log('Realtime notifications connected!');
                                    if (err) {
                                        console.error('Realtime subscription error:', err);
                                    }
                                });
                            if (mounted) notificationsChannelRef.current = channel;
                        } catch(bgError: any) {
                             console.error("Error fetching non-critical data:", bgError);
                        }
                    })();
    
                } catch (e: any) {
                    console.error("Error setting up session data:", e);
                    if (mounted) {
                        loadedUserIdRef.current = null;
                        if (e.code === 'PGRST116') setError('rls_error');
                        else {
                            // SAFEGUARD: Ensure error message is a string
                            const msg = e.message || (typeof e === 'string' ? e : "Failed to initialize application data.");
                            setError(msg);
                        }
                        
                        // Reset sensitive state on error
                        setProfile(null);
                        setPermissions({});
                        setUserNotifications([]);
                    }
                } finally {
                    clearTimeout(timeoutId);
                    if (mounted) setSessionLoading(false);
                }
            } else {
                // No session
                if (mounted) {
                    loadedUserIdRef.current = null;
                    setProfile(null);
                    setPermissions({});
                    setUserNotifications([]);
                    setLogoUrl(null);
                    setSessionLoading(false);
                }
            }
        });
    
        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);
    
    // Online/Visibility status listener
    useEffect(() => {
        const handleOnline = () => {
            showNotification(tRef.current('notification.connection.restored'), 'success');
            // Try to refresh session when coming back online if needed, but be gentle
            supabase.auth.getSession();
        };
        const handleOffline = () => showNotification(tRef.current('notification.connection.lost'), 'error');

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                // When coming back to foreground, check if session is still valid.
                // We rely on auto-refresh, but this check ensures UI sync.
                const { data } = await supabase.auth.getSession();
                if (!data.session) {
                    // Only refresh if session seems missing but might be recoverable
                    supabase.auth.refreshSession();
                }
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);


    const contextValue: AppContextType = useMemo(() => ({
        session, user, profile, permissions, loading, error, logout,
        language, setLanguage, t,
        activePage, navigateTo,
        theme, toggleTheme,
        notifications, showNotification, dismissNotification,
        userNotifications, unreadCount, markNotificationAsRead, markAllNotificationsAsRead, notificationsPanelOpen, setNotificationsPanelOpen,
        activeReadingNotification, setActiveReadingNotification,
        passwordRecoveryRequired, setPasswordRecoveryRequired,
        logoUrl, setLogoUrl,
        refreshSession,
        activeVisit, startVisit, endVisit, markVisitAsSaved
    }), [
        session, user, profile, permissions, loading, error, logout,
        language, setLanguage, t,
        activePage, navigateTo,
        theme, toggleTheme,
        notifications, showNotification, dismissNotification,
        userNotifications, unreadCount, markAllNotificationsAsRead, markNotificationAsRead, notificationsPanelOpen, setNotificationsPanelOpen,
        activeReadingNotification,
        passwordRecoveryRequired,
        logoUrl,
        refreshSession,
        activeVisit, startVisit, endVisit, markVisitAsSaved
    ]);

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};
