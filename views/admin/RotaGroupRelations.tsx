
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { RotaGroup, Customer, District, Seller } from '../../types';
import { Save, Loader2, Search, ChevronLeft, ChevronRight, Filter, Download, Upload, CheckSquare, ListFilter, Users } from 'lucide-react';

// Tell TypeScript that the XLSX global variable exists
declare var XLSX: any;

const RotaGroupRelations: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Rota Group Relations'];

    const [rotaGroups, setRotaGroups] = useState<RotaGroup[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [sellers, setSellers] = useState<Seller[]>([]);
    
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
    const [selectedSellerId, setSelectedSellerId] = useState<string>('');
    const [relationshipFilter, setRelationshipFilter] = useState<'all' | 'selected' | 'unselected'>('all');
    
    // State to hold the original relationships from the DB for the selected group
    const [associatedCustomerIds, setAssociatedCustomerIds] = useState<Set<string>>(new Set());
    // State to hold the UI checkbox states
    const [checkedCustomerIds, setCheckedCustomerIds] = useState<Set<string>>(new Set());
    // State to hold customers associated with the selected seller
    const [sellerCustomerIds, setSellerCustomerIds] = useState<Set<string>>(new Set());
    
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Search and pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!pagePermissions?.can_view) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const groupsPromise = supabase.from('rota_groups').select('*').order('name');
                const customersPromise = supabase.from('customers').select('*').order('name');
                const districtsPromise = supabase.from('districts').select('*').order('name');
                const sellersPromise = supabase.from('sellers').select('*').order('name');
                
                const [
                    { data: groupsData, error: groupsError }, 
                    { data: customersData, error: customersError },
                    { data: districtsData, error: districtsError },
                    { data: sellersData, error: sellersError }
                ] = await Promise.all([groupsPromise, customersPromise, districtsPromise, sellersPromise]);

                if (groupsError) throw groupsError;
                if (customersError) throw customersError;
                if (districtsError) throw districtsError;
                if (sellersError) throw sellersError;

                setRotaGroups(groupsData || []);
                setCustomers(customersData || []);
                setDistricts(districtsData || []);
                setSellers(sellersData || []);
            } catch (error: any) {
                console.error("Error fetching initial data:", error);
                showNotification(error.message || "Failed to load data.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [pagePermissions, showNotification]);

    // Fetch relationships when a group is selected
    const fetchRelationships = async () => {
        if (!selectedGroupId) {
            setAssociatedCustomerIds(new Set());
            setCheckedCustomerIds(new Set());
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('rota_group_customers')
                .select('customer_id')
                .eq('rota_group_id', selectedGroupId);

            if (error) throw error;
            
            const idSet = new Set<string>((data || []).map(rel => rel.customer_id));
            setAssociatedCustomerIds(idSet);
            setCheckedCustomerIds(idSet); // Sync UI checkboxes with DB state
        } catch (error: any) {
             console.error("Error fetching relationships:", error);
             showNotification(error.message || "Failed to load relationships.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRelationships();
    }, [selectedGroupId, showNotification]);

    // Fetch seller customers when a seller is selected
    useEffect(() => {
        const fetchSellerCustomers = async () => {
            if (!selectedSellerId) {
                setSellerCustomerIds(new Set());
                return;
            }
            // We don't trigger full loading here to allow smoother filtering interaction
            try {
                const { data, error } = await supabase
                    .from('customer_seller_relationships')
                    .select('customer_id')
                    .eq('seller_id', selectedSellerId);

                if (error) throw error;
                const idSet = new Set<string>((data || []).map(rel => rel.customer_id));
                setSellerCustomerIds(idSet);
            } catch (error: any) {
                console.error("Error fetching seller customers:", error);
                showNotification("Failed to filter by seller.", "error");
            }
        };

        fetchSellerCustomers();
    }, [selectedSellerId, showNotification]);

    const filteredCustomers = useMemo(() => {
        let result = customers;
        
        // 1. Filter by Seller
        if (selectedSellerId) {
            result = result.filter(c => sellerCustomerIds.has(c.id));
        }

        // 2. Filter by Relationship Status
        if (selectedGroupId) {
            if (relationshipFilter === 'selected') {
                result = result.filter(c => checkedCustomerIds.has(c.id));
            } else if (relationshipFilter === 'unselected') {
                result = result.filter(c => !checkedCustomerIds.has(c.id));
            }
        }

        // 3. Filter by District
        if (selectedDistrictId) {
            result = result.filter(c => c.district_id === selectedDistrictId);
        }

        // 4. Search
        if (searchTerm) {
             const lowercasedFilter = searchTerm.toLowerCase();
             result = result.filter(customer =>
                customer.name.toLowerCase().includes(lowercasedFilter) ||
                customer.customer_code.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        return result;
    }, [customers, searchTerm, selectedDistrictId, relationshipFilter, selectedGroupId, checkedCustomerIds, selectedSellerId, sellerCustomerIds]);

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredCustomers.slice(startIndex, endIndex);
    }, [filteredCustomers, currentPage, itemsPerPage]);


    const handleCheckboxChange = (customerId: string, isChecked: boolean) => {
        setCheckedCustomerIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(customerId);
            } else {
                newSet.delete(customerId);
            }
            return newSet;
        });
    };
    
    const handleSelectAllFiltered = (isChecked: boolean) => {
        const filteredIds = new Set(filteredCustomers.map(c => c.id));
        setCheckedCustomerIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                for (const id of filteredIds) {
                    newSet.add(id);
                }
            } else {
                for (const id of filteredIds) {
                    newSet.delete(id);
                }
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!selectedGroupId || !pagePermissions?.can_edit) return;
        setIsSaving(true);
        try {
            const initialIds = associatedCustomerIds;
            const currentIds = checkedCustomerIds;

            const idsToAdd = [...currentIds].filter(id => !initialIds.has(id));
            const idsToRemove = [...initialIds].filter(id => !currentIds.has(id));

            const promises = [];

            if (idsToAdd.length > 0) {
                const recordsToAdd = idsToAdd.map(customerId => ({
                    customer_id: customerId,
                    rota_group_id: selectedGroupId,
                    created_by: profile?.id
                }));
                promises.push(supabase.from('rota_group_customers').insert(recordsToAdd));
            }

            if (idsToRemove.length > 0) {
                promises.push(
                    supabase.from('rota_group_customers')
                        .delete()
                        .eq('rota_group_id', selectedGroupId)
                        .in('customer_id', idsToRemove)
                );
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises);
                const errors = results.filter(res => res.error);

                if (errors.length > 0) {
                    throw new Error(errors.map(e => e.error?.message).join(', '));
                }
            }

            showNotification(t('notification.relations.saveSuccess'));
            setAssociatedCustomerIds(new Set(currentIds));

        } catch (error: any) {
            showNotification(t('notification.relations.saveError').replace('{error}', error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Excel Import Logic
    const handleDownloadTemplate = () => {
        const headers = ["Rota Group Name", "Customer Code"];
        const sampleData = ["Baku Center Group", "CUST-001"];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RotaAssignments");
        XLSX.writeFile(wb, "Rota_Group_Assignments_Template.xlsx");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (jsonData.length === 0) {
                throw new Error("The Excel file is empty or has no data.");
            }

            // Create lookup maps
            const groupMap = new Map(rotaGroups.map(g => [g.name.toLowerCase().trim(), g.id]));
            const customerMap = new Map(customers.map(c => [c.customer_code.toLowerCase().trim(), c.id]));

            const assignmentsToInsert: any[] = [];

            jsonData.forEach((row: any) => {
                const groupName = String(row["Rota Group Name"] || '').toLowerCase().trim();
                const customerCode = String(row["Customer Code"] || '').toLowerCase().trim();

                const groupId = groupMap.get(groupName);
                const customerId = customerMap.get(customerCode);

                if (groupId && customerId) {
                    assignmentsToInsert.push({
                        rota_group_id: groupId,
                        customer_id: customerId,
                        created_by: profile?.id
                    });
                }
            });

            if (assignmentsToInsert.length === 0) {
                throw new Error("No valid assignments found. Please check Rota Group Names and Customer Codes.");
            }

            // Perform Insert (ignore duplicates)
            const { error } = await supabase
                .from('rota_group_customers')
                .upsert(assignmentsToInsert, { onConflict: 'rota_group_id,customer_id', ignoreDuplicates: true });

            if (error) throw error;

            showNotification(`${assignmentsToInsert.length} assignments processed successfully.`, 'success');
            
            // Refresh relationships if needed
            if (selectedGroupId) {
                fetchRelationships();
            }

        } catch (error: any) {
            console.error("Import failed:", error);
            showNotification(`Import failed: ${error.message}`, 'error');
        } finally {
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    if (!pagePermissions?.can_view) {
        return <p className="text-text-secondary dark:text-dark-text-secondary">{t('error.accessDenied.message')}</p>
    }

    const isAllFilteredSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => checkedCustomerIds.has(c.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('rotaGroupRelations.title')}</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        {t('customers.downloadTemplate')}
                    </button>
                    {pagePermissions?.can_edit && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
                            <button onClick={handleImportClick} disabled={isImporting} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
                                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {isImporting ? 'Importing...' : 'Import Assignments'}
                            </button>
                        </>
                    )}
                    {pagePermissions?.can_edit && selectedGroupId && (
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                            {isSaving ? 'Saving...' : t('relations.save')}
                        </button>
                    )}
                </div>
            </div>
            
             <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <select 
                        value={selectedGroupId}
                        onChange={e => {
                            setSelectedGroupId(e.target.value);
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="w-full p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent"
                    >
                        <option value="">{t('rotaGroupRelations.selectGroup')}</option>
                        {rotaGroups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>

                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            value={selectedSellerId}
                            onChange={(e) => {
                                setSelectedSellerId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent appearance-none"
                        >
                            <option value="">{t('visitRequestReport.filters.selectSeller')}: All</option>
                            {sellers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <div className="relative">
                         <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                         <select
                            value={selectedDistrictId}
                            onChange={(e) => {
                                setSelectedDistrictId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent appearance-none"
                        >
                            <option value="">{t('customers.district')}: All</option>
                            {districts.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>

                    <div className="relative">
                         <CheckSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                         <select
                            value={relationshipFilter}
                            onChange={(e) => {
                                setRelationshipFilter(e.target.value as 'all' | 'selected' | 'unselected');
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent appearance-none"
                            disabled={!selectedGroupId}
                        >
                            <option value="all">Status: {t('visitRequestReport.filters.all')}</option>
                            <option value="selected">Status: {t('relations.associated')}</option>
                            <option value="unselected">Status: Unassigned</option>
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                
                    {selectedGroupId && (
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('relations.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:ring-accent dark:focus:ring-dark-accent focus:border-accent dark:focus:border-dark-accent"
                            />
                        </div>
                    )}
                 </div>
                 
                 {/* Second Row for Items Per Page & Stats */}
                 {selectedGroupId && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                         <div className="flex items-center gap-2">
                             <ListFilter className="h-5 w-5 text-gray-400" />
                             <span className="text-sm text-text-secondary dark:text-dark-text-secondary">Rows:</span>
                             <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="p-1 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm focus:ring-accent"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={30}>30</option>
                                <option value={40}>40</option>
                                <option value={50}>50</option>
                                <option value={60}>60</option>
                                <option value={70}>70</option>
                                <option value={80}>80</option>
                                <option value={90}>90</option>
                                <option value={100}>100</option>
                                <option value={150}>150</option>
                                <option value={200}>200</option>
                                <option value={500}>500</option>
                            </select>
                         </div>
                         <div className="text-sm text-text-secondary dark:text-dark-text-secondary">
                             {filteredCustomers.length} customers found
                         </div>
                    </div>
                 )}

                {loading ? <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div> : 
                 !selectedGroupId ? (
                    <div className="text-center p-8 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border">
                        <p className="text-text-secondary dark:text-dark-text-secondary">{t('rotaGroupRelations.noGroupSelected')}</p>
                    </div>
                 ) : (
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-hidden flex flex-col h-[calc(100vh-18rem)]">
                        <div className="overflow-auto flex-1">
                            <table className="min-w-full divide-y divide-border dark:divide-dark-border relative">
                                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">
                                            <input
                                                type="checkbox"
                                                className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary dark:text-dark-primary focus:ring-accent dark:focus:ring-dark-accent"
                                                checked={isAllFilteredSelected}
                                                onChange={e => handleSelectAllFiltered(e.target.checked)}
                                                disabled={!pagePermissions?.can_edit}
                                                title={t('relations.selectAll')}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">{t('relations.customerCode')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">{t('relations.customerName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">{t('customers.district')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border dark:divide-dark-border">
                                    {paginatedCustomers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-primary dark:text-dark-primary focus:ring-accent dark:focus:ring-dark-accent"
                                                    checked={checkedCustomerIds.has(customer.id)}
                                                    onChange={e => handleCheckboxChange(customer.id, e.target.checked)}
                                                    disabled={!pagePermissions?.can_edit}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{customer.customer_code}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">
                                                {districts.find(d => d.id === customer.district_id)?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-text-secondary dark:text-dark-text-secondary">
                                                No customers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-border dark:border-dark-border bg-surface dark:bg-dark-surface z-20 relative">
                                <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                                    {t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm flex items-center gap-1 rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        {t('pagination.previous')}
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm flex items-center gap-1 rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('pagination.next')}
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RotaGroupRelations;
