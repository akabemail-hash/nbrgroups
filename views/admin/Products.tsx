
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import { Product, ProductGroup } from '../../types';
import { Plus, Edit, Trash2, X, AlertTriangle, Upload, Download, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Tell TypeScript that the XLSX global variable exists
declare var XLSX: any;

const ITEMS_PER_PAGE = 15;

// --- Product Form Modal ---
const ProductModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Partial<Product>) => Promise<void>;
    product: Partial<Product> | null;
    productGroups: ProductGroup[];
}> = ({ isOpen, onClose, onSave, product, productGroups }) => {
    const { t, profile } = useAppContext();
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(product || { price: 0 });
        setSaveError(null);
    }, [product]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
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
                product_group_id: formData.product_group_id || null, // Ensure null if empty string
                created_by: product?.id ? formData.created_by : profile?.id,
                updated_at: new Date().toISOString(),
            });
        } catch (error: any) {
            console.error("Failed to save product:", error);
            setSaveError(error.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-lg flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-border dark:border-dark-border">
                    <h2 className="text-xl font-bold">{product?.id ? t('products.editProduct') : t('products.addProduct')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {saveError && (
                            <div className="md:col-span-2 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded-md text-sm">
                                {saveError}
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">{t('products.productCode')}</label>
                            <input type="text" name="product_code" value={formData.product_code || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">{t('products.name')}</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">{t('products.group')}</label>
                            <select 
                                name="product_group_id" 
                                value={formData.product_group_id || ''} 
                                onChange={handleChange} 
                                className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">{t('common.none')}</option>
                                {productGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('products.brand')}</label>
                            <input type="text" name="brand" value={formData.brand || ''} onChange={handleChange} className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('products.price')}</label>
                            <input type="number" step="0.01" name="price" value={formData.price ?? ''} onChange={handleChange} required className="w-full py-2 px-3 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary" />
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


// --- Product Management Main Component ---
const Products: React.FC = () => {
    const { t, permissions, showNotification, profile } = useAppContext();
    const pagePermissions = permissions['Products'];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [products, setProducts] = useState<Product[]>([]);
    const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchInitialData = useCallback(async () => {
        try {
            const { data } = await supabase.from('product_groups').select('*').order('name');
            setProductGroups(data || []);
        } catch (error) {
            console.error("Error fetching groups:", error);
        }
    }, []);

    useEffect(() => {
        if (pagePermissions?.can_view) {
            fetchInitialData();
        }
    }, [pagePermissions, fetchInitialData]);

    const fetchProducts = useCallback(async () => {
        if (!pagePermissions?.can_view) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            let query = supabase
                .from('products')
                .select('*, product_group:product_groups(name)', { count: 'exact' })
                .order('name', { ascending: true })
                .range(startIndex, startIndex + ITEMS_PER_PAGE - 1);

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,product_code.ilike.%${searchTerm}%`);
            }
            
            const { data, error, count } = await query;

            if (error) throw error;
            if (data) setProducts(data as Product[]);
            setTotalCount(count || 0);

        } catch (error: any) {
            console.error("Error fetching products: ", error);
            showNotification(`Failed to fetch products: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [pagePermissions, showNotification, currentPage, searchTerm]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchProducts();
        }, 300); // Debounce search
        return () => clearTimeout(handler);
    }, [fetchProducts]);

    const handleAdd = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };
    
    const handleDeleteConfirm = (product: Product) => {
        setDeletingProduct(product);
    };

    const handleDelete = async () => {
        if (!deletingProduct || !pagePermissions?.can_delete) return;
        const { error } = await supabase.from('products').delete().eq('id', deletingProduct.id);
        if (error) {
            showNotification(error.message, 'error');
        } else {
            showNotification(t('notification.product.deleted'));
            setDeletingProduct(null);
            fetchProducts();
        }
    };
    
    const handleSave = async (productData: Partial<Product>) => {
        const { product_group, ...saveData } = productData; // Remove joined object
        const { error } = await supabase.from('products').upsert(saveData);

        if (error) {
            console.error("Supabase save error:", error);
            if (error.message.includes('products_product_code_key')) {
                throw new Error(t('notification.product.saveErrorUnique'));
            }
            throw new Error(error.message);
        }
        
        showNotification(productData.id ? t('notification.product.updated') : t('notification.product.added'));
        setIsModalOpen(false);
        fetchProducts();
    };

    const handleDownloadTemplate = () => {
        const headers = ["Product Code", "Name", "Brand", "Price"];
        const sampleData = ["PROD-001", "Sample Product", "Sample Brand", 99.99];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Products");
        XLSX.writeFile(wb, "Product_Import_Template.xlsx");
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
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error("The Excel file is empty or has no data.");
            }

            const headerMap: { [key: string]: keyof Product } = {
                "Product Code": "product_code",
                "Name": "name",
                "Brand": "brand",
                "Price": "price",
            };

            const productsToUpsert = jsonData.map(row => {
                const product: Partial<Product> = {
                    created_by: profile?.id,
                    updated_at: new Date().toISOString()
                };

                for (const excelHeader in headerMap) {
                    if (Object.prototype.hasOwnProperty.call(row, excelHeader) && row[excelHeader] !== null && row[excelHeader] !== undefined) {
                        const dbKey = headerMap[excelHeader];
                        const value = row[excelHeader];

                        if (dbKey === 'price') {
                            const num = parseFloat(String(value));
                            (product as any)[dbKey] = isNaN(num) ? 0 : num;
                        } else {
                            (product as any)[dbKey] = String(value);
                        }
                    }
                }
                return product;
            }).filter(p => p.product_code && p.name);


            if (productsToUpsert.length === 0) {
                throw new Error("No valid product data found. Ensure 'Product Code' and 'Name' columns are present and filled.");
            }
            
            const { error } = await supabase.from('products').upsert(productsToUpsert, { onConflict: 'product_code' });

            if (error) {
                throw error;
            }

            showNotification(t('notification.product.importSuccess').replace('{count}', productsToUpsert.length.toString()));
            fetchProducts();
        } catch (error: any) {
            console.error("Import failed:", error);
            showNotification(t('notification.product.importError').replace('{error}', error.message), 'error');
        } finally {
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">{t('products.title')}</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        {t('products.downloadTemplate')}
                    </button>
                    {pagePermissions?.can_create && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".xlsx, .xls" />
                            <button onClick={handleImportClick} disabled={isImporting} className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-wait">
                                {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {isImporting ? t('customers.import.processing') : t('products.importProducts')}
                            </button>
                            <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-secondary dark:hover:bg-dark-secondary transition-colors text-sm">
                                <Plus className="h-5 w-5 mr-2" />
                                {t('products.addProduct')}
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {!pagePermissions?.can_view ? (
                <p className="text-text-secondary dark:text-dark-text-secondary">You do not have permission to view products.</p>
            ) : (
                <>
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
                        className="w-full md:w-1/3 p-2 pl-10 bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-md"
                    />
                </div>
                <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-md border border-border dark:border-dark-border overflow-x-auto">
                    <table className="min-w-full divide-y divide-border dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('products.productCode')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('products.name')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('products.group')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('products.brand')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('products.price')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">{t('products.actions')}</th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface dark:bg-dark-surface divide-y divide-border dark:divide-dark-border">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-8 text-text-secondary">No products found.</td></tr>
                            ) : (
                                products.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-dark-text-primary">{product.product_code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{product.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{product.product_group?.name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{product.brand}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary dark:text-dark-text-secondary">{product.price.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                            {pagePermissions?.can_edit && <button onClick={() => handleEdit(product)} className="text-accent dark:text-dark-accent hover:underline"><Edit className="h-4 w-4 inline-block" /></button>}
                                            {pagePermissions?.can_delete && <button onClick={() => handleDeleteConfirm(product)} className="text-red-600 dark:text-red-500 hover:underline"><Trash2 className="h-4 w-4 inline-block" /></button>}
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
            
            <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} product={editingProduct} productGroups={productGroups} />

            {deletingProduct && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-surface dark:bg-dark-surface rounded-lg shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-lg font-bold mb-2">{t('form.delete')} Product</h3>
                            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-6">{t('products.form.confirmDelete')}</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setDeletingProduct(null)} className="px-4 py-2 text-sm font-medium rounded-md border border-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-gray-800">{t('form.cancel')}</button>
                                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">{t('form.delete')}</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default Products;
