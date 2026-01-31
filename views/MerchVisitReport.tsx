import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../services/supabase';
import { VisitRequest, Customer } from '../types';
import { Loader2, Star, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

const ITEMS_PER_PAGE = 9;

const ReadOnlyStarRating: React.FC<{ rating: number | null | undefined }> = ({ rating }) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 1; i <= 5; i++) {
        stars.push(
            <Star key={i} className={`h-4 w-4 ${i <= fullStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-500'}`} />
        );
    }
    return <div className="flex">{stars}</div>;
};

const ReportCard: React.FC<{ request: VisitRequest, onImageClick: (url: string) => void }> = ({ request, onImageClick }) => {
    const { t } = useAppContext();
    const getStatusChip = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    return (
        <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border p-4 flex flex-col space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-text-primary dark:text-dark-text-primary">{request.customer?.name}</h3>
                    <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">{request.visit_type?.name}</p>
                </div>
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusChip(request.status)}`}>
                    {t(`visitRequests.status.${request.status}`)}
                </span>
            </div>
            <div className="text-sm space-y-1">
                <p><strong>{t('visitRequests.requestDate')}:</strong> {request.request_date}</p>
                {request.completed_at && <p><strong>{t('visitRequestReport.completedOn')}:</strong> {new Date(request.completed_at).toLocaleDateString()}</p>}
                {request.admin_rating && (
                    <div className="flex items-center gap-2">
                        <strong>{t('visitRequestReport.rated')}:</strong>
                        <ReadOnlyStarRating rating={request.admin_rating} />
                    </div>
                )}
            </div>
            {request.completion_notes && <p className="text-sm italic border-l-2 border-border dark:border-dark-border pl-2">"{request.completion_notes}"</p>}
            <div className="grid grid-cols-2 gap-2 pt-2">
                {(request.completion_photo_before_url || request.completion_photo_after_url) ? (
                    <>
                        <div className="text-center">
                            <p className="text-xs font-semibold mb-1">{t('myVisitRequests.photoBefore')}</p>
                            {request.completion_photo_before_url ? (
                                <img src={request.completion_photo_before_url} onClick={() => onImageClick(request.completion_photo_before_url!)} alt="Before" className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80"/>
                            ) : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center"><ImageIcon className="h-6 w-6 text-gray-400"/></div>}
                        </div>
                         <div className="text-center">
                            <p className="text-xs font-semibold mb-1">{t('myVisitRequests.photoAfter')}</p>
                            {request.completion_photo_after_url ? (
                                <img src={request.completion_photo_after_url} onClick={() => onImageClick(request.completion_photo_after_url!)} alt="After" className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80"/>
                            ) : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center"><ImageIcon className="h-6 w-6 text-gray-400"/></div>}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

const MerchVisitReport: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Merch Visit Report'];

    const [requests, setRequests] = useState<VisitRequest[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const initialFilters = {
        startDate: '',
        endDate: '',
        customerId: '',
        minRating: 1,
        maxRating: 5,
    };
    const [filters, setFilters] = useState(initialFilters);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchReports = useCallback(async (page: number, currentFilters: typeof initialFilters) => {
        if (!pagePermissions?.can_view || !profile) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setRequests([]);
        setCustomers([]);
        try {
            const { data: merchProfile, error: merchProfileError } = await supabase
                .from('merchs')
                .select('id')
                .eq('user_id', profile.id)
                .single();

            if (merchProfileError || !merchProfile) {
                throw new Error(t('salesDashboard.error.profileLink').replace('{roleName}', 'Merchandiser'));
            }

            const { data: relations, error: relationsError } = await supabase.from('customer_merch_relationships').select('customer_id').eq('merch_id', merchProfile.id);
            if (relationsError) throw relationsError;

            const customerIds = relations.map(r => r.customer_id);
            if (customerIds.length > 0) {
                const { data: customersData, error: customersError } = await supabase.from('customers').select('*').in('id', customerIds).order('name');
                if (customersError) throw customersError;
                setCustomers(customersData || []);
            }

            let query = supabase
                .from('visit_requests')
                .select('*, customer:customers(*), merch:merchs(*), visit_type:visit_types(*)', { count: 'exact' })
                .eq('merch_id', merchProfile.id);

            if (currentFilters.startDate) query = query.gte('request_date', currentFilters.startDate);
            if (currentFilters.endDate) query = query.lte('request_date', currentFilters.endDate);
            if (currentFilters.customerId) query = query.eq('customer_id', currentFilters.customerId);
            if (currentFilters.minRating > 1) query = query.gte('admin_rating', currentFilters.minRating);
            if (currentFilters.maxRating < 5) query = query.lte('admin_rating', currentFilters.maxRating);

            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('request_date', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setRequests((data as any) || []);
            setTotalCount(count || 0);
        } catch (err: any) {
            const errorMessage = err.message || 'An unknown error occurred';
            setError(errorMessage);
            showNotification(`${t('salesDashboard.error.loadFailed')}: ${errorMessage}`, 'error');
            setRequests([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, profile, showNotification, t]);
    
    useEffect(() => {
        if (profile) {
            fetchReports(1, initialFilters);
        } else {
            setLoading(false);
        }
    }, [profile, fetchReports]);

    const handleFilterChange = (field: keyof typeof filters, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [field]: value };
            if (field === 'minRating' && Number(value) > newFilters.maxRating) newFilters.maxRating = Number(value);
            if (field === 'maxRating' && Number(value) < newFilters.minRating) newFilters.minRating = Number(value);
            return newFilters;
        });
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchReports(1, filters);
    };

    const handleResetFilters = () => {
        setFilters(initialFilters);
        setCurrentPage(1);
        fetchReports(1, initialFilters);
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (loading) return <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

    if (error) {
        return (
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg">
                 <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">{t('salesDashboard.error.loadFailed')}</h3>
                    <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
                </div>
            </div>
        );
    }

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('merchVisitReport.title')}</h1>
            
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.dateRange')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                     <div>
                         <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.customer')}</label>
                         <select value={filters.customerId} onChange={e => handleFilterChange('customerId', e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="">{t('visitRequestReport.filters.selectCustomer')} ({t('visitRequestReport.filters.all')})</option>
                             {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                         </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.ratingRange')}</label>
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" max="5" value={filters.minRating} onChange={e => handleFilterChange('minRating', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                            <input type="number" min="1" max="5" value={filters.maxRating} onChange={e => handleFilterChange('maxRating', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                    <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('visitRequestReport.filters.apply')}</button>
                </div>
            </div>

            {requests.length === 0 ? <p className="text-center py-8 text-text-secondary">{t('merchVisitReport.noResults')}</p> :
             (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => <ReportCard key={req.id} request={req} onImageClick={setViewingImage}/>)}
                    </div>
                    {totalPages > 1 && (
                         <div className="flex items-center justify-between p-4">
                            <span className="text-sm text-text-secondary">{t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))} ({totalCount} {t('common.results')})</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentPage(p => p - 1); fetchReports(currentPage - 1, filters); }} disabled={currentPage === 1} className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                                <button onClick={() => { setCurrentPage(p => p + 1); fetchReports(currentPage + 1, filters); }} disabled={currentPage === totalPages} className="px-3 py-1 text-sm rounded-md border disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                        </div>
                    )}
                </>
             )
            }
            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                    <img src={viewingImage} alt="Visit" className="max-w-full max-h-full rounded-lg" />
                </div>
            )}
        </div>
    );
};

export default MerchVisitReport;
