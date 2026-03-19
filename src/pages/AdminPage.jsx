import React, { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import { Plus, Edit2, Trash2, ArrowLeft, LogOut, Package, Grid, AlertCircle, Printer, Settings, FlaskConical, Wifi, MonitorPlay, ArrowUpDown, ChevronDown, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminProductForm from '../components/AdminProductForm';
import AdminCategoryManager from '../components/AdminCategoryManager';
import AdminAllergenManager from '../components/AdminAllergenManager';
import AdminMediaManager from '../components/AdminMediaManager';
import AdminProductOrder from '../components/AdminProductOrder';
import AdminTopSellers from '../components/AdminTopSellers';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getLocalizedName } from '../context/ProductContext';



const AdminPage = () => {
    const { products, categories, deleteProduct } = useProducts();
    const { t, language } = useLanguage();
    const [editingProduct, setEditingProduct] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeTab, setActiveTab] = useState('products');
    const [screensaverTimeout, setScreensaverTimeout] = useState(() => {
        const saved = localStorage.getItem('screensaver_timeout');
        return saved ? parseInt(saved, 10) : 60000;
    });
    
    // Restaurant Status Toggle State
    const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    React.useEffect(() => {
        if (activeTab === 'settings') {
            const fetchStatus = async () => {
                const { data } = await supabase.from('configuracion').select('restaurante_abierto').eq('id', 1).single();
                if (data) setIsRestaurantOpen(data.restaurante_abierto);
            };
            fetchStatus();
        }
    }, [activeTab]);

    const toggleRestaurantStatus = async () => {
        setIsLoadingStatus(true);
        const newState = !isRestaurantOpen;
        const { error } = await supabase.from('configuracion').update({ restaurante_abierto: newState }).eq('id', 1);
        if (!error) {
            setIsRestaurantOpen(newState);
        } else {
            alert('Error al actualizar el estado del restaurante. Comprueba los permisos.');
        }
        setIsLoadingStatus(false);
    };
    const handleTimeoutChange = (e) => {
        const val = parseInt(e.target.value, 10);
        setScreensaverTimeout(val);
        localStorage.setItem('screensaver_timeout', val);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('delete_confirm'))) {
            await deleteProduct(id);
        }
    };

    const [expandedCategories, setExpandedCategories] = useState({});

    const toggleCategoryExpand = (id) => {
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const categoryIds = React.useMemo(() => {
        if (!activeCategory || activeCategory === 'all') return [];

        const getDescendants = (cats, rootId, visited = new Set(), depth = 0) => {
            if (depth > 10 || visited.has(rootId)) return [rootId];
            visited.add(rootId);

            let ids = [rootId];
            const children = cats.filter(c => c.parent_id === rootId);
            for (const child of children) {
                ids = [...ids, ...getDescendants(cats, child.id, visited, depth + 1)];
            }
            return ids;
        };

        return getDescendants(categories, activeCategory);
    }, [categories, activeCategory]);

    const filteredProducts = activeCategory === 'all'
        ? products
        : products.filter(p => categoryIds.includes(p.categoryId));

    const rootCategories = categories
        .filter(c => !c.parent_id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const getSubcategories = (parentId) => categories
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return (
        <div className="min-h-screen bg-[#12100B] flex flex-col">
            {/* Header */}
            <header className="bg-[#12100B] border-b border-[#c28744]/20 sticky top-0 z-10">
                {/* Top row: back + title + lang */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button onClick={handleLogout} className="p-2 hover:bg-[#c28744]/10 rounded-full text-[#c28744] transition-colors" title={t('logout')}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-serif font-black text-[#c28744] leading-none">{t('admin_panel')}</h1>
                    </div>
                    <LanguageSwitcher />
                </div>

                {/* Tabs row — horizontally scrollable, no scrollbar visible, touch-friendly */}
                <div
                    className="flex gap-1 px-4 pb-3 overflow-x-auto"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                    {[
                        { id: 'products', icon: <Package size={15} />, label: t('tab_products') },
                        { id: 'top-sellers', icon: <Star size={15} />, label: 'Top Sellers' },
                        { id: 'product-order', icon: <ArrowUpDown size={15} />, label: 'Ordenar Productos' },
                        { id: 'categories', icon: <Grid size={15} />, label: t('tab_categories') },
                        { id: 'allergens', icon: <AlertCircle size={15} />, label: t('tab_allergens') },
                        { id: 'settings', icon: <Settings size={15} />, label: t('tab_settings') },
                        { id: 'screensaver', icon: <MonitorPlay size={15} />, label: 'Screensaver' },
                    ].map(({ id, icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all ${activeTab === id
                                ? 'bg-[#c28744] text-[#12100B] shadow'
                                : 'text-[#c28744] bg-[#2C1A0F] border border-[#c28744]/20 hover:bg-[#c28744]/10'
                                }`}
                        >
                            {icon}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 p-4 overflow-hidden flex gap-6">

                {activeTab === 'products' && (
                    <>
                        {/* Sidebar Categorías (Hierarchical Accordion) */}
                        <div className="w-64 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                            <button
                                onClick={() => setIsCreating(true)}
                                className="bg-[#2C1A0F] hover:bg-[#3E2515] text-[#c28744] border border-[#c28744]/30 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors mb-4"
                            >
                                <Plus size={20} /> {t('new_product')}
                            </button>

                            <button
                                onClick={() => setActiveCategory('all')}
                                className={`text-left px-4 py-2.5 rounded-lg font-bold text-sm transition-colors mb-2 ${activeCategory === 'all' ? 'bg-[#c28744] text-[#12100B] shadow-md' : 'text-[#c28744] hover:bg-[#c28744]/10'}`}
                            >
                                {t('all_products')}
                            </button>

                            {rootCategories.map(cat => {
                                const renderRecursiveCategory = (category, level = 0) => {
                                    if (level > 10) return null; // Guard against infinite recursion
                                    const subs = getSubcategories(category.id);
                                    const hasSubs = subs.length > 0;
                                    const isExpanded = expandedCategories[category.id];
                                    const isActive = activeCategory === category.id;

                                    return (
                                        <div key={category.id} className="flex flex-col gap-1 mb-1">
                                            <div className="flex gap-1" style={{ marginLeft: level > 0 ? `${level * 0.75}rem` : 0 }}>
                                                <button
                                                    onClick={() => {
                                                        setActiveCategory(category.id);
                                                        if (hasSubs) toggleCategoryExpand(category.id);
                                                    }}
                                                    className={`flex-1 text-left px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${isActive ? 'bg-[#c28744] text-[#12100B] shadow-sm' : 'text-[#c28744] hover:bg-[#c28744]/10'}`}
                                                >
                                                    {level > 0 && <span className="opacity-40">└</span>}
                                                    <span className={`${level === 0 ? 'text-lg' : 'text-sm'}`}>{category.icon}</span>
                                                    <span className="truncate">{category.name}</span>
                                                </button>
                                                {hasSubs && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleCategoryExpand(category.id);
                                                        }}
                                                        className={`px-2 py-2 rounded-lg text-[#c28744] hover:bg-[#c28744]/10 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {hasSubs && isExpanded && (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {subs.map(sub => renderRecursiveCategory(sub, level + 1))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                };

                                return renderRecursiveCategory(cat);
                            })}
                        </div>

                        {/* Lista de Productos / Formulario */}
                        <div className="flex-1 overflow-y-auto">
                            {(isCreating || editingProduct) ? (
                                <div className="max-w-2xl mx-auto">
                                    <AdminProductForm
                                        productToEdit={editingProduct}
                                        onCancel={() => { setIsCreating(false); setEditingProduct(null); }}
                                        onSuccess={() => { setIsCreating(false); setEditingProduct(null); }}
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredProducts.map(product => (
                                        <div key={product.id} className="bg-[#FFF8E7] p-4 rounded-xl border border-[#c28744]/20 shadow-sm hover:shadow-md transition-shadow flex gap-4 group">
                                            <img src={product.image || null} alt={product.name} className="w-24 h-24 object-cover rounded-lg bg-[#12100B]" />
                                            <div className="flex-1 flex flex-col">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-serif font-bold text-[#2C1A0F]">{getLocalizedName(product, language)}</h3>
                                                    <span className="font-mono font-bold text-[#c28744]">{parseFloat(product.price || 0).toFixed(2)}€</span>
                                                </div>
                                                <p className="text-sm text-[#5A4033] line-clamp-2 mt-1 flex-1">{product.desc}</p>
                                                <div className="flex justify-end gap-2 mt-3">
                                                    <button
                                                        onClick={() => setEditingProduct(product)}
                                                        className="p-2 text-[#5A4033] hover:text-[#c28744] hover:bg-[#c28744]/10 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-[#5A4033] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'top-sellers' && (
                    <div className="max-w-4xl mx-auto w-full">
                        <h2 className="text-xl font-serif font-black text-[#c28744] mb-4">Gestionar Destacados (Top Sellers)</h2>
                        <AdminTopSellers />
                    </div>
                )}

                {activeTab === 'product-order' && (
                    <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
                        <h2 className="text-xl font-serif font-black text-[#c28744] mb-4">Ordenar Productos por Categoría</h2>
                        <p className="text-[#9A7B6A] text-sm mb-6">
                            Utiliza los botones de arriba y abajo para cambiar el orden en que aparecen los productos en el kiosco. El botón "Guardar Orden" confirma los cambios en Supabase.
                        </p>
                        <AdminProductOrder />
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="max-w-4xl mx-auto w-full">
                        <AdminCategoryManager />
                    </div>
                )}

                {activeTab === 'allergens' && (
                    <div className="max-w-4xl mx-auto w-full">
                        <AdminAllergenManager />
                    </div>
                )}

                {activeTab === 'screensaver' && (
                    <div className="max-w-4xl mx-auto w-full">
                        <AdminMediaManager />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto w-full">
                        <h2 className="text-xl font-serif font-black text-[#c28744] mb-6">{t('settings_title')}</h2>


                        {/* Restaurant Open/Close Toggle Card */}
                        <div className="bg-[#1E150A] border border-[#c28744]/20 rounded-2xl p-6 mb-4">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[#FFF8E7] font-bold text-lg flex items-center gap-2">
                                        <MonitorPlay size={20} className="text-[#c28744]" />
                                        Estado del Restaurante (Apertura/Cierre)
                                    </h3>
                                    <p className="text-[#9A7B6A] text-sm">
                                        Si lo cierras, aparecerá un mensaje de "Cocina Cerrada" que impedirá a los usuarios hacer pedidos en el kiosco.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <button
                                        onClick={toggleRestaurantStatus}
                                        disabled={isLoadingStatus}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:opacity-50 ${isRestaurantOpen ? 'bg-green-600' : 'bg-red-600'}`}
                                    >
                                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isRestaurantOpen ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Screensaver Timeout Card */}
                        <div className="bg-[#1E150A] border border-[#c28744]/20 rounded-2xl p-6 mb-4">
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[#FFF8E7] font-bold text-lg flex items-center gap-2">
                                        <MonitorPlay size={20} className="text-[#c28744]" />
                                        Tiempo de Inactividad (Screensaver)
                                    </h3>
                                    <p className="text-[#9A7B6A] text-sm">
                                        Tiempo de espera sin tocar la pantalla antes de que salte el salvapantallas.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <select
                                        value={screensaverTimeout}
                                        onChange={handleTimeoutChange}
                                        className="bg-[#2C1A0F] border border-[#c28744]/30 text-[#c28744] font-bold text-sm rounded-lg focus:ring-[#c28744] focus:border-[#c28744] block w-full p-2.5"
                                    >
                                        <option value={15000}>15 Segundos</option>
                                        <option value={30000}>30 Segundos</option>
                                        <option value={60000}>1 Minuto (Por defecto)</option>
                                        <option value={120000}>2 Minutos</option>
                                        <option value={300000}>5 Minutos</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <p className="text-[#5A4033] text-xs text-center mt-4">
                            {t('settings_restart_warning')}
                        </p>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AdminPage;
