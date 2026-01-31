import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { Loader2, Users, CheckCircle, Clock, MapPin, ExternalLink, RefreshCw } from 'lucide-react';

interface TeamMemberStats {
  merch_id: string;
  merch_name: string;
  total_planned: number;
  completed_visits: number;
  last_known_latitude: number | null;
  last_known_longitude: number | null;
  last_location_updated_at: string | null;
}

const TeamDashboard: React.FC = () => {
    const { t, profile, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Team Dashboard'];

    const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTeamStats = useCallback(async () => {
        if (!profile || !pagePermissions?.can_view) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_seller_team_stats');
            if (error) throw error;
            setTeamStats(data || []);
        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [profile, pagePermissions, showNotification]);

    useEffect(() => {
        fetchTeamStats();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchTeamStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchTeamStats]);

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">{t('teamDashboard.title')}</h1>
                <button 
                    onClick={fetchTeamStats} 
                    className="p-2 bg-surface dark:bg-dark-surface rounded-full border border-border dark:border-dark-border hover:bg-gray-100 transition-colors"
                    disabled={loading}
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : teamStats.length === 0 ? (
                <div className="bg-surface dark:bg-dark-surface p-12 rounded-xl text-center border border-border dark:border-dark-border">
                    <Users className="h-12 w-12 mx-auto text-text-secondary mb-4 opacity-20" />
                    <p className="text-text-secondary">{t('teamDashboard.noMerchs')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamStats.map(member => {
                        const progress = member.total_planned > 0 ? (member.completed_visits / member.total_planned) * 100 : 0;
                        return (
                            <div key={member.merch_id} className="bg-surface dark:bg-dark-surface rounded-xl shadow-lg border border-border dark:border-dark-border overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                                <div className="p-5 border-b border-border dark:border-dark-border bg-gray-50/50 dark:bg-gray-800/50">
                                    <h3 className="font-bold text-lg">{member.merch_name}</h3>
                                </div>
                                <div className="p-5 space-y-6">
                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-text-secondary">{t('dashboard.kpi.todayVisits')}</span>
                                            <span className="text-sm font-bold">{member.completed_visits} / {member.total_planned}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-primary'}`} 
                                                style={{ width: `${Math.min(100, progress)}%` }} 
                                            />
                                        </div>
                                    </div>

                                    {/* Location Info */}
                                    <div className="pt-2 border-t border-border dark:border-dark-border">
                                        <div className="flex items-center gap-2 text-text-secondary mb-2">
                                            <MapPin className="h-4 w-4" />
                                            <span className="text-xs font-bold uppercase">{t('teamDashboard.lastLocation')}</span>
                                        </div>
                                        {member.last_known_latitude ? (
                                            <div className="space-y-3">
                                                <p className="text-xs">{new Date(member.last_location_updated_at!).toLocaleString()}</p>
                                                <a 
                                                    href={`https://www.google.com/maps?q=${member.last_known_latitude},${member.last_known_longitude}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full py-2 bg-accent/10 text-accent rounded-lg text-sm font-bold hover:bg-accent/20 transition-colors"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    {t('common.viewOnMap')}
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-xs italic text-gray-400">{t('common.locationNotReported')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TeamDashboard;