
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { CompetitorPriceAIReport } from '../../types';
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, GitCommitHorizontal, FileText } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

const CompetitorPriceAnalysisAIReport: React.FC = () => {
    const { t, permissions, showNotification } = useAppContext();
    const pagePermissions = permissions['Competitor Price Analysis AI Report'];

    const [reportData, setReportData] = useState<CompetitorPriceAIReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);

    const [filters, setFilters] = useState({ startDate: '', endDate: '' });

    const fetchReport = useCallback(async (page: number, currentFilters: typeof filters) => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const startIndex = (page - 1) * ITEMS_PER_PAGE;

            const rpcParams: any = {
                page_size: ITEMS_PER_PAGE,
                page_offset: startIndex,
            };
            if (currentFilters.startDate) rpcParams.filter_start_date = `${currentFilters.startDate}T00:00:00.000Z`;
            if (currentFilters.endDate) rpcParams.filter_end_date = `${currentFilters.endDate}T23:59:59.999Z`;

            const { data, error } = await supabase.rpc('get_competitor_price_ai_report', rpcParams);

            if (error) throw error;
            
            setReportData(data || []);
            if (data && data.length > 0) {
                setTotalCount(data[0].total_records || 0);
            } else {
                setTotalCount(0);
            }

        } catch (error: any) {
            showNotification(`Failed to load AI report: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification]);

    useEffect(() => {
        fetchReport(currentPage, filters);
    }, [currentPage, filters, fetchReport]);

    const handleFilterChange = (field: 'startDate' | 'endDate', value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchReport(1, filters);
    };

    const handleResetFilters = () => {
        setFilters({ startDate: '', endDate: '' });
        setCurrentPage(1);
        // The useEffect will handle the re-fetch as filters state updates
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('competitorPriceAnalysisAIReport.title')}</h1>
            
             {/* Filters */}
             <div className="p-4 bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('visitRequestReport.filters.dateRange')}</label>
                        <div className="flex items-center gap-2">
                             <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                             <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="w-full p-2 bg-transparent border border-border dark:border-dark-border rounded-md text-sm" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('visitRequestReport.filters.reset')}</button>
                    <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary">{t('visitRequestReport.filters.apply')}</button>
                </div>
            </div>

            {loading ? (
                <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary dark:text-dark-primary" /></div>
            ) : reportData.length === 0 ? (
                <div className="text-center p-12 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                    <FileText className="h-12 w-12 mx-auto text-text-secondary dark:text-dark-text-secondary" />
                    <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">{t('competitorPriceAnalysisAIReport.noResults')}</p>
                </div>
            ) : (
                <>
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                        <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('competitorPriceAnalysisAIReport.product')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('competitorPriceAnalysisAIReport.ourPrice')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider flex items-center gap-1"><TrendingDown className="h-4 w-4 text-green-500" /> {t('competitorPriceAnalysisAIReport.lowestCompetitorPrice')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider flex items-center gap-1"><TrendingUp className="h-4 w-4 text-red-500" /> {t('competitorPriceAnalysisAIReport.highestCompetitorPrice')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider flex items-center gap-1"><GitCommitHorizontal className="h-4 w-4 text-blue-500" /> {t('competitorPriceAnalysisAIReport.averageCompetitorPrice')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                                {reportData.map(row => (
                                    <tr key={row.report_product_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{row.product_name} ({row.product_code})</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{row.our_price.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">{row.lowest_competitor_price.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-semibold">{row.highest_competitor_price.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400 font-semibold">{Number(row.average_competitor_price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4">
                            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                                {t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))}
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CompetitorPriceAnalysisAIReport;
