
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Seller, Customer, District, SalesRouteReportItem, RotaGroup } from '../../types';
import { Loader2, Filter, CheckCircle, Circle, ChevronLeft, ChevronRight, X, XCircle, AlertTriangle, Clock } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const VisitDetailsModal: React.FC<{ 
    visitId: string; 
    onClose: () => void; 
}> = ({ visitId, onClose }) => {
    const { t } = useAppContext();
    const [visit, setVisit] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchVisitDetails = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('seller_visits')
                .select('*, customer:customers(name), seller:sellers(name), visit_type:visit_types(name), no_visit_reason:no_visit_reasons(name)')
                .eq('id', visitId)
                .single();
            
            if (error) {
                console.error("Error fetching visit details:", error);
            } else {
                setVisit(data);
            }
            setLoading(false);
        };
        fetchVisitDetails();
    }, [visitId]);

    if (!visit && !loading) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{visit?.is_visit ? t('salesRouteReport.visitDetails') : t('dailyPlan.noVisit')}</h2>
                    <button onClick={onClose}><X className="h-6 w-6" /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <>
                             <div>
                                <h3 className="font-bold text-lg">{visit.customer?.name}</h3>
                                <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{visit.seller?.name}</p>
                                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">{new Date(visit.visit_datetime).toLocaleString()}</p>
                            </div>
                            
                            {visit.is_visit ? (
                                <>
                                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                        <div>
                                            <span className="text-xs uppercase font-bold text-text-secondary dark:text-dark-text-secondary block mb-1">{t('dailyPlan.visitType')}</span>
                                            <span className="text-sm font-semibold">{visit.visit_type?.name}</span>
                                        </div>
                                        {visit.duration_minutes !== null && (
                                            <div className="text-right">
                                                <span className="text-xs uppercase font-bold text-text-secondary dark:text-dark-text-secondary block mb-1">Duration</span>
                                                <div className="flex items-center justify-end gap-1 text-blue-700 dark:text-blue-300 font-bold">
                                                    <Clock className="h-4 w-4" />
                                                    {visit.duration_minutes}m
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {visit.description && (
                                        <div>
                                            <span className="text-xs uppercase font-bold text-text-secondary dark:text-dark-text-secondary block mb-1">{t('dailyPlan.description')}</span>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-border dark:border-dark-border">
                                                <p className="text-sm italic">"{visit.description}"</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div className="text-center">
                                            <p className="text-xs font-semibold mb-1">{t('dailyPlan.beforeImages')}</p>
                                            {visit.before_image_urls && visit.before_image_urls.length > 0 ? (
                                                <img 
                                                    src={visit.before_image_urls[0]} 
                                                    alt="Before" 
                                                    className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border"
                                                    onClick={() => setViewingImage(visit.before_image_urls[0])}
                                                />
                                            ) : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400 text-xs">No Image</div>}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold mb-1">{t('dailyPlan.afterImages')}</p>
                                            {visit.after_image_urls && visit.after_image_urls.length > 0 ? (
                                                <img 
                                                    src={visit.after_image_urls[0]} 
                                                    alt="After" 
                                                    className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 border border-border dark:border-dark-border"
                                                    onClick={() => setViewingImage(visit.after_image_urls[0])}
                                                />
                                            ) : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center text-gray-400 text-xs">No Image</div>}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                        <AlertTriangle className="text-red-500 h-5 w-5" />
                                        <div>
                                            <p className="text-xs uppercase font-bold text-red-800 dark:text-red-300">{t('dailyPlan.noVisitReason')}</p>
                                            <p className="text-sm font-semibold">{visit.no_visit_reason?.name}</p>
                                        </div>
                                    </div>
                                    {visit.no_visit_description && (
                                        <div>
                                            <p className="text-xs uppercase font-bold text-text-secondary mb-1">{t('dailyPlan.explanation')}</p>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-border">
                                                <p className="text-sm whitespace-pre-wrap italic">"{visit.no_visit_description}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
                 {viewingImage && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
                        <img src={viewingImage} alt="Full size" className="max-w-full max-h-full rounded-lg" />
                        <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><X/></button>
                    </div>
                )}
            </div>
        </div>
    );
};

const SalesRouteReport: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Sales Route Report'];

    const [sellers, setSellers] = useState<Seller[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [rotaGroups, setRotaGroups] = useState<RotaGroup[]>([]);
    
    // Filters
    const today = new Date();
    const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [selectedSellerId, setSelectedSellerId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedRotaGroupId, setSelectedRotaGroupId] = useState('');

    const [reportData, setReportData] = useState<SalesRouteReportItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
    const [rotaGroupCustomerIds, setRotaGroupCustomerIds] = useState<Set<string>>(new Set());

    // Fetch filters data
    useEffect(() => {
        const fetchFilters = async () => {
             if (!pagePermissions?.can_view) return;
             try {
                const [sellersRes, customersRes, districtsRes, rotaRes] = await Promise.all([
                    supabase.from('sellers').select('*').order('name'),
                    supabase.from('customers').select('*').order('name'),
                    supabase.from('districts').select('*').order('name'),
                    supabase.from('rota_groups').select('*').order('name')
                ]);
                
                if (sellersRes.error) throw sellersRes.error;
                if (customersRes.error) throw customersRes.error;
                if (districtsRes.error) throw districtsRes.error;
                if (rotaRes.error) throw rotaRes.error;

                setSellers(sellersRes.data || []);
                setCustomers(customersRes.data || []);
                setDistricts(districtsRes.data || []);
                setRotaGroups(rotaRes.data || []);
             } catch (error: any) {
                 showNotification("Failed to load filters", "error");
             }
        };
        fetchFilters();
    }, [pagePermissions, showNotification]);

    // Handle Rota Group Selection
    useEffect(() => {
        const fetchRotaCustomers = async () => {
            if (!selectedRotaGroupId) {
                setRotaGroupCustomerIds(new Set());
                return;
            }
            const { data, error } = await supabase
                .from('rota_group_customers')
                .select('customer_id')
                .eq('rota_group_id', selectedRotaGroupId);
            
            if (error) {
                console.error("Error fetching rota customers", error);
            } else {
                setRotaGroupCustomerIds(new Set(data.map(d => d.customer_id)));
            }
        };
        fetchRotaCustomers();
    }, [selectedRotaGroupId]);

    const fetchReport = useCallback(async (page: number) => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
             const startIndex = (page - 1) * ITEMS_PER_PAGE;
             const rpcParams: any = {
                 filter_start_date: startDate,
                 filter_end_date: endDate,
                 filter_status: selectedStatus,
                 page_limit: ITEMS_PER_PAGE,
                 page_offset: startIndex
             };
             
             if (selectedSellerId) rpcParams.filter_seller_id = selectedSellerId;
             if (selectedCustomerId) rpcParams.filter_customer_id = selectedCustomerId;
             if (selectedDistrictId) rpcParams.filter_district_id = selectedDistrictId;
             if (selectedRotaGroupId) rpcParams.filter_rota_group_id = selectedRotaGroupId;

             const { data, error } = await supabase.rpc('get_sales_route_report', rpcParams);
             if (error) throw error;
             
             const items = data as SalesRouteReportItem[] || [];
             setReportData(items);
             setTotalCount(items.length > 0 ? items[0].total_count : 0);

        } catch (error: any) {
            console.error(error);
            showNotification(`Failed to load report: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedSellerId, selectedCustomerId, selectedDistrictId, selectedStatus, selectedRotaGroupId, pagePermissions, showNotification]);

    useEffect(() => {
        fetchReport(currentPage);
    }, [currentPage, fetchReport]);


    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchReport(1);
    };

    const handleResetFilters = () => {
        const today = new Date();
        setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        setSelectedSellerId('');
        setSelectedCustomerId('');
        setSelectedDistrictId('');
        setSelectedStatus('all');
        setSelectedRotaGroupId('');
        setCurrentPage(1);
    };
    
    // Filter available customers in dropdown based on Rota Group
    const availableCustomers = useMemo(() => {
        if (!selectedRotaGroupId) return customers;
        return customers.filter(c => rotaGroupCustomerIds.has(c.id));
    }, [customers, selectedRotaGroupId, rotaGroupCustomerIds]);
    
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) return <p className="text-text-secondary">{t('error.accessDenied.message')}</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('salesRouteReport.title')}</h1>

            {/* Filters */}
             <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.dateRange')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.seller')}</label>
                        <select value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                            <option value="">{t('visitRequestReport.filters.all')}</option>
                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium mb-1">{t('rotaGroups.title')}</label>
                         <select value={selectedRotaGroupId} onChange={e => { setSelectedRotaGroupId(e.target.value); setSelectedCustomerId(''); }} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="">{t('visitRequestReport.filters.all')}</option>
                             {rotaGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.customer')}</label>
                         <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="">{t('visitRequestReport.filters.all')}</option>
                             {availableCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                    </div>
                     <div>
                         <label className="block text-sm font-medium mb-1">{t('customers.district')}</label>
                         <select value={selectedDistrictId} onChange={e => setSelectedDistrictId(e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="">{t('visitRequestReport.filters.all')}</option>
                             {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                         </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium mb-1">{t('salesRouteReport.filters.status')}</label>
                         <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm">
                             <option value="all">{t('salesRouteReport.filters.status.all')}</option>
                             <option value="completed">{t('salesRouteReport.filters.status.completed')}</option>
                             <option value="no_visit">{t('salesRouteReport.filters.status.noVisit')}</option>
                             <option value="pending">{t('salesRouteReport.filters.status.pending')}</option>
                         </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                    <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('visitRequestReport.filters.apply')}</button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('salesRouteReport.routeDate')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('visitRequestReport.filters.seller')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('visitRequestReport.filters.customer')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.district')}</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">Dur.</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('salesRouteReport.visitStatus')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border dark:divide-dark-border bg-surface dark:bg-dark-surface">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>
                            ) : reportData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-text-secondary">{t('visitRequestReport.noResults')}</td></tr>
                            ) : (
                                reportData.map((item, index) => (
                                    <tr key={`${item.route_date}-${item.seller_id}-${item.customer_id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-dark-text-primary">{new Date(item.route_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary font-medium">{item.seller_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary font-medium">{item.customer_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{item.district_name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {item.duration_minutes !== null ? (
                                                <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                                    <Clock className="h-3 w-3" />
                                                    {item.duration_minutes}m
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {item.is_completed ? (
                                                item.is_visit_flag ? (
                                                    <button 
                                                        onClick={() => item.visit_id && setSelectedVisitId(item.visit_id)} 
                                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200 transition-colors"
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                        {t('salesRouteReport.status.Completed')}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => item.visit_id && setSelectedVisitId(item.visit_id)} 
                                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 transition-colors"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                        {t('salesRouteReport.status.NoVisit')}
                                                    </button>
                                                )
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 cursor-default">
                                                    <Circle className="h-3 w-3" />
                                                    {t('salesRouteReport.status.Pending')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-border dark:border-dark-border">
                        <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                            {t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))} ({totalCount} results)
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {selectedVisitId && <VisitDetailsModal visitId={selectedVisitId} onClose={() => setSelectedVisitId(null)} />}
        </div>
    );
};

export default SalesRouteReport;
