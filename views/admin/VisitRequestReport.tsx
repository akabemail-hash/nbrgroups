
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { VisitRequest, Customer, Seller } from '../../types';
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
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{request.seller?.name}</p>
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

const VisitRequestReport: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Visit Request Report'];

    const [requests, setRequests] = useState<VisitRequest[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const initialFilters = {
        startDate: '',
        endDate: '',
        filterType: 'seller',
        entityId: '',
        minRating: 1,
        maxRating: 5,
    };
    const [filters, setFilters] = useState(initialFilters);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const fetchDropdownData = useCallback(async () => {
        try {
            const sellersPromise = supabase.from('sellers').select('*').order('name');
            const customersPromise = supabase.from('customers').select('*').order('name');
            const [{ data: sellersData, error: sellersError }, { data: customersData, error: customersError }] = await Promise.all([sellersPromise, customersPromise]);
            if (sellersError || customersError) throw sellersError || customersError;
            setSellers(sellersData || []);
            setCustomers(customersData || []);
        } catch (error: any) {
            showNotification(`Failed to load filter data: ${error.message}`, 'error');
        }
    }, [showNotification]);

    const fetchReports = useCallback(async (page: number, currentFilters: typeof filters) => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let query = supabase
                .from('visit_requests')
                .select('*, customer:customers(*), seller:sellers(*), visit_type:visit_types(*)', { count: 'exact' })
                .not('seller_id', 'is', null);

            if (currentFilters.startDate) query = query.gte('request_date', currentFilters.startDate);
            if (currentFilters.endDate) query = query.lte('request_date', currentFilters.endDate);
            if (currentFilters.entityId) {
                if (currentFilters.filterType === 'seller') query = query.eq('seller_id', currentFilters.entityId);
                else query = query.eq('customer_id', currentFilters.entityId);
            }
            if (currentFilters.minRating > 1) query = query.gte('admin_rating', currentFilters.minRating);
            if (currentFilters.maxRating < 5) query = query.lte('admin_rating', currentFilters.maxRating);

            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            query = query.range(startIndex, startIndex + ITEMS_PER_PAGE - 1).order('request_date', { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;

            setRequests((data as any) || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            showNotification(`Failed to load reports: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);
    
    useEffect(() => {
        fetchDropdownData();
        fetchReports(1, initialFilters);
    }, [fetchDropdownData, fetchReports]);

    const handleFilterChange = (field: keyof typeof filters, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [field]: value };
            if (field === 'filterType') {
                newFilters.entityId = '';
            }
            if (field === 'minRating' && Number(value) > newFilters.maxRating) {
                newFilters.maxRating = Number(value);
            }
            if (field === 'maxRating' && Number(value) < newFilters.minRating) {
                newFilters.minRating = Number(value);
            }
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

    if (!pagePermissions?.can_view) return <p>{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('visitRequestReport.title')}</h1>
            
            {/* Filters */}
            <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.dateRange')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.filterBy')}</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleFilterChange('filterType', 'seller')} className={`flex-1 p-2 rounded-md text-sm ${filters.filterType === 'seller' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{t('visitRequestReport.filters.seller')}</button>
                            <button onClick={() => handleFilterChange('filterType', 'customer')} className={`flex-1 p-2 rounded-md text-sm ${filters.filterType === 'customer' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{t('visitRequestReport.filters.customer')}</button>
                        </div>
                    </div>
                     <div>
                         <label className="block text-sm font-medium mb-1 invisible">Entity</label>
                         <select value={filters.entityId} onChange={e => handleFilterChange('entityId', e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="">{filters.filterType === 'seller' ? t('visitRequestReport.filters.selectSeller') : t('visitRequestReport.filters.selectCustomer')} ({t('visitRequestReport.filters.all')})</option>
                             {(filters.filterType === 'seller' ? sellers : customers).map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
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

            {/* Results */}
            {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> :
             requests.length === 0 ? <p className="text-center py-8 text-text-secondary">{t('visitRequestReport.noResults')}</p> :
             (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map(req => <ReportCard key={req.id} request={req} onImageClick={setViewingImage}/>)}
                    </div>
                    {totalPages > 1 && (
                         <div className="flex items-center justify-between p-4">
                            <span className="text-sm text-text-secondary">{t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))} ({totalCount} results)</span>
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

export default VisitRequestReport;