
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { TopCustomer } from '../types';
import { Loader2, Calendar, ClipboardCheck, Users, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface DailyPlanStats {
    total: number;
    completed: number;
    pending: number;
}

interface RequestStats {
    assignedToday: number;
    completedToday: number;
    totalMonth: number;
}

const KpiCard: React.FC<{ title: string; icon: React.ElementType; colorClass: string; children: React.ReactNode; }> = ({ title, icon: Icon, colorClass, children }) => (
    <div className={`bg-surface dark:bg-dark-surface rounded-xl shadow-lg border-l-4 ${colorClass} p-6`}>
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-full ${colorClass.replace('border-', 'bg-')} bg-opacity-10`}>
                 <Icon className={`h-6 w-6 ${colorClass.replace('border-', 'text-')}`} />
            </div>
            <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const StatRow: React.FC<{ label: string; value: number | string; icon: React.ElementType; }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between p-3 bg-background dark:bg-dark-background rounded-lg">
        <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-text-secondary dark:text-dark-text-secondary" />
            <span className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{label}</span>
        </div>
        <span className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{value}</span>
    </div>
);

const SalesDashboard: React.FC = () => {
    const { t, profile, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Sales Dashboard'];

    const [planStats, setPlanStats] = useState<DailyPlanStats | null>(null);
    const [requestStats, setRequestStats] = useState<RequestStats | null>(null);
    const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getErrorMessage = useCallback((error: any): string => {
        if (!error) return t('common.unknownError');
        if (typeof error === 'string') return error;
        if (error.message) return error.message;
        if (error.error_description) return error.error_description;
        if (error.details) return error.details;
        try {
            return JSON.stringify(error);
        } catch {
            return t('common.unknownError');
        }
    }, [t]);

    const fetchData = useCallback(async () => {
        if (!profile || !pagePermissions?.can_view) {
            setLoading(false);
            return;
        }

        const roleName = profile.role?.name;
        const isSeller = roleName === 'Satış';
        const isMerch = roleName === 'Merch';

        if (!isSeller && !isMerch) {
            setLoading(false);
            setError(t('salesDashboard.error.roleMismatch').replace('{roleName}', roleName || t('common.none')));
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const rpcPlanName = isSeller ? 'get_daily_plan_for_seller' : 'get_daily_plan_for_merch';
            const visitTable = isSeller ? 'seller_visits' : 'merch_visits';
            const roleIdTable = isSeller ? 'sellers' : 'merchs';
            const roleIdField = isSeller ? 'seller_id' : 'merch_id';

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const today = new Date().toISOString().split('T')[0];
            const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).toISOString().split('T')[0];

            const { data: roleProfile, error: roleError } = await supabase
                .from(roleIdTable)
                .select('id')
                .eq('user_id', profile.id)
                .single();
            
            if (roleError || !roleProfile) {
                throw new Error(t('salesDashboard.error.profileLink').replace('{roleName}', roleName || t('common.none')));
            }
            const entityId = roleProfile.id;

            const [
                planResponse,
                completedVisitsResponse,
                todayRequestsResponse,
                monthRequestsResponse,
                topCustomersResponse
            ] = await Promise.all([
                supabase.rpc(rpcPlanName),
                supabase.from(visitTable).select('customer_id', { count: 'exact' }).eq(roleIdField, entityId).gte('visit_datetime', todayStart.toISOString()),
                supabase.from('visit_requests').select('status', { count: 'exact' }).eq(roleIdField, entityId).eq('request_date', today),
                supabase.from('visit_requests').select('id', { count: 'exact' }).eq(roleIdField, entityId).gte('request_date', monthStart),
                supabase.rpc('get_top_customers_by_requests', { user_role: roleName || '', user_profile_id: profile.id })
            ]);

            if (planResponse.error) throw planResponse.error;
            const totalPlanned = planResponse.data?.length || 0;
            if (completedVisitsResponse.error) throw completedVisitsResponse.error;
            const completedPlanned = completedVisitsResponse.count || 0;
            setPlanStats({
                total: totalPlanned,
                completed: completedPlanned,
                pending: Math.max(0, totalPlanned - completedPlanned)
            });

            if (todayRequestsResponse.error) throw todayRequestsResponse.error;
            const assignedToday = todayRequestsResponse.count || 0;
            const completedToday = todayRequestsResponse.data?.filter(r => r.status === 'Completed').length || 0;
            if (monthRequestsResponse.error) throw monthRequestsResponse.error;
            const totalMonth = monthRequestsResponse.count || 0;
            setRequestStats({
                assignedToday,
                completedToday,
                totalMonth
            });

            if (topCustomersResponse.error) throw topCustomersResponse.error;
            setTopCustomers(topCustomersResponse.data || []);

        } catch (err: any) {
            console.error("Dashboard fetch error:", err);
            const message = getErrorMessage(err);
            setError(message);
        } finally {
            setLoading(false);
        }

    }, [profile, pagePermissions, t, getErrorMessage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="flex justify-center items-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary dark:text-dark-primary" /></div>;
    }

    if (error) {
        return (
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg">
                 <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">{t('salesDashboard.error.loadFailed')}</h3>
                    <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
                    {error.includes("structure of query does not match") && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 text-left">
                             <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
                                <AlertTriangle className="h-5 w-5" />
                                {t('salesDashboard.dbUpdateRequired')}
                             </div>
                             {t('salesDashboard.dbUpdateMessage')}
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (!pagePermissions?.can_view) {
        return <p>{t('error.accessDenied.message')}</p>
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('salesDashboard.title')}</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-1">{t('dashboard.welcome')}, {profile?.full_name}!</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KpiCard title={t('salesDashboard.dailyPlan.title')} icon={Calendar} colorClass="border-blue-500">
                        {planStats && <>
                            <StatRow label={t('salesDashboard.dailyPlan.total')} value={planStats.total} icon={TrendingUp} />
                            <StatRow label={t('salesDashboard.dailyPlan.completed')} value={planStats.completed} icon={CheckCircle} />
                            <StatRow label={t('salesDashboard.dailyPlan.pending')} value={planStats.pending} icon={Clock} />
                        </>}
                    </KpiCard>
                    <KpiCard title={t('salesDashboard.visitRequests.title')} icon={ClipboardCheck} colorClass="border-orange-500">
                        {requestStats && <>
                            <StatRow label={t('salesDashboard.visitRequests.assignedToday')} value={requestStats.assignedToday} icon={TrendingUp} />
                            <StatRow label={t('salesDashboard.visitRequests.completedToday')} value={requestStats.completedToday} icon={CheckCircle} />
                            <StatRow label={t('salesDashboard.visitRequests.totalMonth')} value={requestStats.totalMonth} icon={Calendar} />
                        </>}
                    </KpiCard>
                </div>

                <div className="lg:col-span-1">
                     <div className="bg-surface dark:bg-dark-surface rounded-xl shadow-lg p-6 h-full border border-border dark:border-dark-border">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                                <Users className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">{t('salesDashboard.topCustomers.title')}</h3>
                        </div>
                        <ul className="space-y-4">
                            {topCustomers.length > 0 ? topCustomers.map((customer, index) => (
                                <li key={customer.customer_id} className="flex items-center justify-between p-3 bg-background dark:bg-dark-background rounded-lg border border-border dark:border-dark-border">
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-lg text-text-secondary dark:text-dark-text-secondary w-6">{index + 1}.</span>
                                        <span className="font-semibold text-text-primary dark:text-dark-text-primary truncate max-w-[120px] sm:max-w-none">{customer.customer_name}</span>
                                    </div>
                                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-tighter rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 whitespace-nowrap">
                                        {customer.request_count} {t('salesDashboard.topCustomers.requests')}
                                    </span>
                                </li>
                            )) : <p className="text-center text-sm text-text-secondary dark:text-dark-text-secondary pt-8 italic">{t('salesDashboard.topCustomers.noResults')}</p>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;
