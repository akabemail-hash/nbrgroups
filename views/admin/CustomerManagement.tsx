
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Customer, CustomerProperty, District } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, Upload, Download, Loader2, Search, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';

// Tell TypeScript that the XLSX global variable exists
declare var XLSX: any;

// --- Customer Form Modal ---
const CustomerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Partial<Customer>) => Promise<void>;
    customer: Partial<Customer> | null;
    properties: CustomerProperty[];
    districts: District[];
}> = ({ isOpen, onClose, onSave, customer, properties, districts }) => {
    const { t, profile } = useAppContext();
    const [formData, setFormData] = useState<Partial<Customer>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(customer || { is_active: true });
        setSaveError(null); // Clear errors when customer changes
    }, [customer]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveError(null);
        try {
            await onSave({
                ...formData,
                created_by: customer?.id ? formData.created_by : profile?.id,
                updated_at: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error("Failed to save customer:", error);
            setSaveError(error.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{customer?.id ? t('customers.form.title.edit') : t('customers.form.title.add')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6">
                        {saveError && (
                            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-md text-sm">
                                {saveError}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fields */}
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.customerCode')}</label>
                                <input type="text" name="customer_code" value={formData.customer_code || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.name')}</label>
                                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.phoneNumber')}</label>
                                <input type="tel" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customerProperties.title')}</label>
                                <select 
                                    name="customer_property_id" 
                                    value={formData.customer_property_id || ''} 
                                    onChange={handleChange} 
                                    className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary"
                                >
                                    <option value="">Select Property</option>
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.contactPersonName')}</label>
                                <input type="text" name="contact_person_name" value={formData.contact_person_name || ''} onChange={handleChange} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                             <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.contactPersonPhone')}</label>
                                <input type="tel" name="contact_person_phone" value={formData.contact_person_phone || ''} onChange={handleChange} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.district')}</label>
                                <select 
                                    name="district_id" 
                                    value={formData.district_id || ''} 
                                    onChange={handleChange} 
                                    className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary"
                                >
                                    <option value="">Select District</option>
                                    {districts.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                {/* Spacer or other fields */}
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.gpsLatitude')}</label>
                                <input type="number" step="any" name="gps_latitude" value={formData.gps_latitude ?? ''} onChange={handleChange} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium mb-1">{t('customers.gpsLongitude')}</label>
                                <input type="number" step="any" name="gps_longitude" value={formData.gps_longitude ?? ''} onChange={handleChange} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{t('customers.address')}</label>
                                <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={3} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary"></textarea>
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{t('customers.notes')}</label>
                                <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary"></textarea>
                            </div>
                            <div className="flex items-center space-x-2">
                                 <input type="checkbox" name="is_active" id="is_active" checked={!!formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                 <label htmlFor="is_active" className="text-sm font-medium">{t('customers.active')}</label>
                            </div>
                        </div>
                    </div>
                     <div className="flex justify-end items-center p-4 border-t border-border dark:border-dark-border">
                        <button type="button" onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary dark:bg-dark-primary rounded-md hover:bg-secondary dark:hover:bg-dark-secondary disabled:opacity-50 disabled:cursor-wait">
                            {isSaving ? 'Saving...' : t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Customer Management Main Component ---
const CustomerManagement: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Customers'];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerProperties, setCustomerProperties] = useState<CustomerProperty[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
    const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

    // Pagination and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);

    const fetchDefinitions = useCallback(async () => {
        try {
            const [propsResponse, districtsResponse] = await Promise.all([
                supabase.from('customer_properties').select('*').order('name'),
                supabase.from('districts').select('*').order('name')
            ]);
            
            setCustomerProperties(propsResponse.data || []);
            setDistricts(districtsResponse.data || []);
        } catch (error) {
            console.error("Error fetching definitions", error);
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const limit = itemsPerPage === -1 ? 10000 : itemsPerPage;
            const startIndex = (currentPage - 1) * limit;
            
            let query = supabase
                .from('customers')
                .select('*, created_by_user:users(full_name), customer_property:customer_properties(name), district:districts(name)', { count: 'exact' })
                .order('name', { ascending: true })
                .range(startIndex, startIndex + limit - 1);

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%`);
            }
            
            const { data, error, count } = await query;

            if (error) throw error;
            if (data) setCustomers(data as Customer[]);
            setTotalCount(count || 0);

        } catch (error: any) {
            console.error("Error fetching customers: ", error);
            showNotification(`Failed to fetch customers: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification, currentPage, searchTerm, itemsPerPage]);

    useEffect(() => {
        if (pagePermissions?.can_view) {
            fetchDefinitions();
        }
    }, [pagePermissions, fetchDefinitions]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchCustomers();
        }, 300); // Debounce search
        return () => clearTimeout(handler);
    }, [fetchCustomers]);

    const handleAdd = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (customer: Customer) => {
        setDeletingCustomer(customer);
    };

    const handleDelete = async () => {
        if (!deletingCustomer || !pagePermissions?.can_delete) return;
        const { error } = await supabase.from('customers').delete().eq('id', deletingCustomer.id);
        if (error) {
            showNotification(error.message, 'error');
        } else {
            setDeletingCustomer(null);
            fetchCustomers();
        }
    };
    
    const handleSave = async (customerData: Partial<Customer>) => {
        const isNewCustomer = !customerData.id;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { created_by_user, customer_property, district, ...restOfData } = customerData;
        const { error } = await supabase.from('customers').upsert(restOfData);

        if (error) {
            console.error("Supabase save error:", error);
            if (error.message.includes('customers_customer_code_key')) {
                throw new Error('This customer code already exists. Please use a unique code.');
            }
            throw new Error(error.message);
        }
        
        if (isNewCustomer) {
            showNotification(t('notification.customer.added'));
        }

        setIsModalOpen(false);
        fetchCustomers();
    };

    const handleDownloadTemplate = () => {
        const headers = ["Customer Code", "Name", "Phone Number", "Contact Person", "Contact Phone", "Address", "Notes", "Is Active (TRUE/FALSE)", "GPS Latitude", "GPS Longitude", "Customer Property", "District"];
        const sampleData = ["CUST-001", "Sample Customer Inc.", "555-123-4567", "John Doe", "555-987-6543", "123 Main St, Anytown, USA", "This is a sample note.", "TRUE", 34.0522, -118.2437, "VIP", "Central District"];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, "Customer_Import_Template.xlsx");
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

            // Fetch properties and districts again to ensure we have the latest map
            const [propsResponse, districtsResponse] = await Promise.all([
                supabase.from('customer_properties').select('*'),
                supabase.from('districts').select('*')
            ]);
            
            const propertiesMap = new Map((propsResponse.data || []).map((p: any) => [p.name.toLowerCase().trim(), p.id]));
            const districtsMap = new Map((districtsResponse.data || []).map((d: any) => [d.name.toLowerCase().trim(), d.id]));

            const headerMap: { [key: string]: keyof Customer | 'customer_property' | 'district_name' } = {
                "Customer Code": "customer_code",
                "Name": "name",
                "Phone Number": "phone_number",
                "Contact Person": "contact_person_name",
                "Contact Phone": "contact_person_phone",
                "Address": "address",
                "Notes": "notes",
                "Is Active (TRUE/FALSE)": "is_active",
                "GPS Latitude": "gps_latitude",
                "GPS Longitude": "gps_longitude",
                "Customer Property": "customer_property",
                "District": "district_name"
            };

            const customersToUpsert = jsonData.map((row: any) => {
                const customer: Partial<Customer> = {
                    created_by: profile?.id,
                    updated_at: new Date().toISOString()
                };

                for (const excelHeader in headerMap) {
                    if (Object.prototype.hasOwnProperty.call(row, excelHeader) && row[excelHeader] !== null && row[excelHeader] !== undefined) {
                        const dbKey = headerMap[excelHeader];
                        const value = row[excelHeader];

                        if (dbKey === 'is_active') {
                            customer.is_active = ['true', '1', 'yes', 'TRUE'].includes(String(value).toUpperCase());
                        } else if (dbKey === 'gps_latitude' || dbKey === 'gps_longitude') {
                            if (value !== null && value !== '') {
                                const num = parseFloat(String(value));
                                customer[dbKey] = isNaN(num) ? null : num;
                            } else {
                                customer[dbKey] = null;
                            }
                        } else if (dbKey === 'customer_property') {
                            const propName = String(value).toLowerCase().trim();
                            if (propertiesMap.has(propName)) {
                                customer.customer_property_id = propertiesMap.get(propName) as string;
                            }
                        } else if (dbKey === 'district_name') {
                            const distName = String(value).toLowerCase().trim();
                            if (districtsMap.has(distName)) {
                                customer.district_id = districtsMap.get(distName) as string;
                            }
                        } else {
                            (customer as any)[dbKey] = String(value);
                        }
                    }
                }
                return customer;
            }).filter(c => c.customer_code && c.name);


            if (customersToUpsert.length === 0) {
                throw new Error("No valid customer data found. Ensure 'Customer Code' and 'Name' columns are present and filled.");
            }
            
            // Note: Upserting with district_id included if matched
            const { error } = await supabase.from('customers').upsert(customersToUpsert, { onConflict: 'customer_code' });

            if (error) {
                throw error;
            }

            showNotification(t('notification.customer.importSuccess').replace('{count}', customersToUpsert.length.toString()));
            fetchCustomers();
        } catch (error: any) {
            console.error("Import failed:", error);
            showNotification(t('notification.customer.importError').replace('{error}', error.message), 'error');
        } finally {
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalCount / itemsPerPage);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('customers.title')}</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        {t('customers.downloadTemplate')}
                    </button>
                    {pagePermissions?.can_create && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
                            <button onClick={handleImportClick} disabled={isImporting} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
                                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {isImporting ? t('customers.import.processing') : t('customers.importCustomers')}
                            </button>
                            <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors text-sm">
                                <Plus className="h-5 w-5 mr-2" />
                                {t('customers.addCustomer')}
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {!pagePermissions?.can_view ? (
                <p className="text-text-secondary dark:text-dark-text-secondary">You do not have permission to view customers.</p>
            ) : (
                <>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('relations.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="w-full p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <ListFilter className="h-5 w-5 text-text-secondary" />
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="p-2 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={150}>150</option>
                            <option value={200}>200</option>
                            <option value={250}>250</option>
                            <option value={300}>300</option>
                            <option value={500}>500</option>
                            <option value={-1}>All</option>
                        </select>
                    </div>
                </div>
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.customerCode')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.district')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customerProperties.title')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.phoneNumber')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.contactPersonName')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.active')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('customers.actions')}</th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan={8} className="text-center p-8 text-text-secondary">No customers found.</td></tr>
                            ) : (
                                customers.map(customer => (
                                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{customer.customer_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.district?.name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.customer_property?.name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.phone_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{customer.contact_person_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                                {customer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                            {pagePermissions?.can_edit && <button onClick={() => handleEdit(customer)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline-block" /></button>}
                                            {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(customer)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline-block" /></button>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4">
                        <span className="text-sm text-text-secondary">
                            {t('pagination.page').replace('{currentPage}', String(currentPage)).replace('{totalPages}', String(totalPages))}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-md border disabled:opacity-50"><ChevronLeft className="h-4 w-4"/></button>
                            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-md border disabled:opacity-50"><ChevronRight className="h-4 w-4"/></button>
                        </div>
                    </div>
                )}
                </>
            )}
            
            <CustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} customer={editingCustomer} properties={customerProperties} districts={districts} />

            {deletingCustomer && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} Customer</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('customers.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingCustomer(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default CustomerManagement;
