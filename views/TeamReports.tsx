import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { MerchVisit, Merch } from '../types';
import { Loader2, ChevronLeft, ChevronRight, Image as ImageIcon, X, Search, Filter } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const TeamReports: React.FC = () => {
    const { t, profile, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Team Reports'];

    const [visits, setVisits] = useState<MerchVisit[]>([]);
    const [teamMembers, setTeamMembers] = useState<Merch[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Filters
    const [selectedMerchId, setSelectedMerchId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchTeam = useCallback(async () => {
        if (!profile) return;
        try {
            const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', profile.id).single();
            if (seller) {
                const { data, error } = await supabase
                    .from('seller_merch_assignments')
                    .select('merch:merchs(*)')
                    .eq('seller_id', seller.id);
                if (error) throw error;
                setTeamMembers((data || []).map((d: any) => d.merch));
            }
        } catch (err) {
            console.error(err);
        }
    }, [profile]);

    const fetchReports = useCallback(async (page: number) => {
        if (!pagePermissions?.can_view || !profile) return;
        setLoading(true);
        try {
            const { data: seller } = await supabase.from('sellers').select('id').eq('user_id', profile.id).single();
            if (!seller) throw new Error("Seller profile not found");

            // RLS and Assignment Logic: First get assigned merch IDs
            const { data: assignments } = await supabase.from('seller_merch_assignments').select('merch_id').eq('seller_id', seller.id);
            const assignedIds = (assignments || []).map(a => a.merch_id);

            if (assignedIds.length === 0) {
                setVisits([]);
                setTotalCount(0);
                setLoading(false);
                return;
            }

            let query = supabase
                .from('merch_visits')
                .select('*, customer:customers(name), merch:merchs(name), visit_type:visit_types(name)', { count: 'exact' })
                .in('merch_id', assignedIds);

            if (selectedMerchId) query = query.eq('merch_id', selectedMerchId);
            if (startDate) query = query.gte('visit_datetime', `${startDate}T00:00:00.000Z`);
            if (endDate) query = query.lte('visit_datetime', `${endDate}T23:59:59.999Z`);

            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('visit_datetime', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setVisits((data as any) || []);
            setTotalCount(count || 0);

        } catch (error: any) {
            showNotification(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [profile, pagePermissions, selectedMerchId, startDate, endDate, showNotification]);

    useEffect(() => {
        fetchTeam();
        fetchReports(1);
    }, [fetchTeam, fetchReports]);

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchReports(1);
    };

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('sidebar.teamReports')}</h1>

            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('teamDashboard.merchList')}</label>
                        <select 
                            value={selectedMerchId} 
                            onChange={e => setSelectedMerchId(e.target.value)}
                            className="w-full p-2 bg-transparent border border-border rounded-md text-sm"
                        >
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.dateRange')}</label>
                        <div className="flex gap-2">
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-transparent border border-border rounded-md text-sm" />
                             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-transparent border border-border rounded-md text-sm" />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleApplyFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-secondary transition-colors">
                            <Filter className="h-4 w-4" />
                            {t('visitRequestReport.filters.apply')}
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : (
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('track.popup.contact')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('visitRequestMerch.merchandiser')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('dailyPlan.visitDateTime')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">{t('visitRequests.visitType')}</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase">{t('visitRequests.photo')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border dark:divide-dark-border">
                                {visits.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{v.customer?.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{v.merch?.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(v.visit_datetime).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{v.visit_type?.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {v.after_image_urls?.[0] ? (
                                                <button onClick={() => setViewingImage(v.after_image_urls![0])} className="p-1 hover:bg-gray-100 rounded">
                                                    <ImageIcon className="h-5 w-5 text-accent" />
                                                </button>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {visits.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-12 text-text-secondary italic">{t('sellerVisitReport.noResults')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {viewingImage && (
                <div className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Visit detail" className="max-w-full max-h-full rounded-lg" />
                </div>
            )}
        </div>
    );
};

export default TeamReports;