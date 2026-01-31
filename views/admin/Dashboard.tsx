import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
// Fix: Import 'CheckCircle' from lucide-react.
import { Loader2, ArrowRight, UserCog, Users, ClipboardCheck, MapPin, Route, ShieldCheck, CalendarClock, Truck, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

interface KpiData {
  todayIssued: number;
  todayCompleted: number;
  todayPending: number;
  monthIssued: number;
  monthCompleted: number;
  monthPending: number;
  monthFixedAssets: number;
}

const KpiCard: React.FC<{ title: string; children: React.ReactNode; icon: React.ElementType }> = ({ title, children, icon: Icon }) => (
    <div className="bg-surface dark:bg-dark-surface rounded-xl shadow-lg border border-border dark:border-dark-border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{title}</h3>
            <Icon className="h-8 w-8 text-primary dark:text-dark-primary" />
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const SubKpi: React.FC<{ label: string; value: number; icon: React.ElementType, colorClass: string }> = ({ label, value, icon: Icon, colorClass }) => (
    <div className="flex items-center justify-between p-3 bg-background dark:bg-dark-background rounded-lg">
        <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${colorClass}`} />
            <span className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{label}</span>
        </div>
        <span className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{value}</span>
    </div>
);


const QuickLinkCard: React.FC<{ title: string; description: string; icon: React.ElementType; onClick: () => void }> = ({ title, description, icon: Icon, onClick }) => (
    <button onClick={onClick} className="bg-surface dark:bg-dark-surface p-6 rounded-xl shadow-lg border border-border dark:border-dark-border text-left group transition-all duration-300 hover:shadow-xl hover:border-primary dark:hover:border-dark-primary hover:-translate-y-1">
        <div className="flex items-center justify-between">
            <div className="p-3 bg-primary/10 dark:bg-dark-primary/20 rounded-lg">
                <Icon className="h-6 w-6 text-primary dark:text-dark-primary" />
            </div>
            <ArrowRight className="h-5 w-5 text-text-secondary dark:text-dark-text-secondary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
        </div>
        <h4 className="mt-4 text-lg font-bold text-text-primary dark:text-dark-text-primary">{title}</h4>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">{description}</p>
    </button>
);


const Dashboard: React.FC = () => {
    const { t, profile, navigateTo, permissions, showNotification } = useAppContext();
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKpis = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

                // Today's Visits
                const { data: todayData, error: todayError } = await supabase
                    .from('visit_requests')
                    .select('status')
                    .eq('request_date', today);
                if (todayError) throw todayError;

                // This Month's Visits
                const { data: monthData, error: monthError } = await supabase
                    .from('visit_requests')
                    .select('status')
                    .gte('request_date', monthStart)
                    .lte('request_date', monthEnd);
                if (monthError) throw monthError;

                // This Month's Fixed Assets
                const { count: assetsCount, error: assetsError } = await supabase
                    .from('fixed_asset_deliveries')
                    .select('*', { count: 'exact', head: true })
                    .gte('delivery_date', `${monthStart}T00:00:00.000Z`)
                    .lte('delivery_date', `${monthEnd}T23:59:59.999Z`);
                if (assetsError) throw assetsError;
                
                setKpiData({
                    todayIssued: todayData.length,
                    todayCompleted: todayData.filter(r => r.status === 'Completed').length,
                    todayPending: todayData.filter(r => r.status === 'Pending').length,
                    monthIssued: monthData.length,
                    monthCompleted: monthData.filter(r => r.status === 'Completed').length,
                    monthPending: monthData.filter(r => r.status === 'Pending').length,
                    monthFixedAssets: assetsCount || 0,
                });

            } catch (error: any) {
                showNotification(`Failed to load dashboard KPIs: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchKpis();
    }, [showNotification]);

    const quickLinks = [
        { icon: UserCog, title: t('dashboard.quickActions.userManagement.title'), description: t('dashboard.quickActions.userManagement.description'), path: '/users', pageName: 'User Management' },
        { icon: Users, title: t('dashboard.quickActions.customerManagement.title'), description: t('dashboard.quickActions.customerManagement.description'), path: '/customers', pageName: 'Customers' },
        { icon: ClipboardCheck, title: t('dashboard.quickActions.visitRequests.title'), description: t('dashboard.quickActions.visitRequests.description'), path: '/visit-requests', pageName: 'Visit Requests' },
        { icon: MapPin, title: t('dashboard.quickActions.liveTracking.title'), description: t('dashboard.quickActions.liveTracking.description'), path: '/track', pageName: 'Track' },
        { icon: Route, title: t('dashboard.quickActions.salesRoutes.title'), description: t('dashboard.quickActions.salesRoutes.description'), path: '/sales-route-planning', pageName: 'Sales Route Planning' },
        { icon: ShieldCheck, title: t('dashboard.quickActions.permissions.title'), description: t('dashboard.quickActions.permissions.description'), path: '/permissions', pageName: 'Permission Management' },
    ];
    
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('dashboard.title')}</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-1">{t('dashboard.welcome')}, {profile?.full_name}!</p>
            </div>

            {loading ? (
                 <div className="flex justify-center items-center p-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary dark:text-dark-primary" />
                </div>
            ) : kpiData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard title={t('dashboard.kpi.todayVisits')} icon={CalendarClock}>
                       <SubKpi label={t('dashboard.kpi.issued')} value={kpiData.todayIssued} icon={TrendingUp} colorClass="text-blue-500" />
                       <SubKpi label={t('dashboard.kpi.completed')} value={kpiData.todayCompleted} icon={CheckCircle} colorClass="text-green-500" />
                       <SubKpi label={t('dashboard.kpi.pending')} value={kpiData.todayPending} icon={TrendingDown} colorClass="text-yellow-500" />
                    </KpiCard>
                    <KpiCard title={t('dashboard.kpi.monthVisits')} icon={CalendarClock}>
                       <SubKpi label={t('dashboard.kpi.issued')} value={kpiData.monthIssued} icon={TrendingUp} colorClass="text-blue-500" />
                       <SubKpi label={t('dashboard.kpi.completed')} value={kpiData.monthCompleted} icon={CheckCircle} colorClass="text-green-500" />
                       <SubKpi label={t('dashboard.kpi.pending')} value={kpiData.monthPending} icon={TrendingDown} colorClass="text-yellow-500" />
                    </KpiCard>
                    <KpiCard title={t('dashboard.kpi.monthAssets')} icon={Truck}>
                         <div className="flex items-center justify-between p-3 bg-background dark:bg-dark-background rounded-lg">
                            <span className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary">{t('dashboard.kpi.totalDeliveries')}</span>
                            <span className="text-4xl font-extrabold text-text-primary dark:text-dark-text-primary">{kpiData.monthFixedAssets}</span>
                        </div>
                    </KpiCard>
                </div>
            )}
            
            <div>
                <h2 className="text-2xl font-semibold text-text-primary dark:text-dark-text-primary mb-4">{t('dashboard.quickActions.title')}</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {quickLinks
                        .filter(link => permissions[link.pageName]?.can_navigate)
                        .map(link => (
                            <QuickLinkCard 
                                key={link.path}
                                title={link.title}
                                description={link.description}
                                icon={link.icon}
                                onClick={() => navigateTo(link.path)}
                            />
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
