import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { PRODUCTS as STATIC_PRODUCTS, CATEGORIES as STATIC_CATEGORIES, ALLERGENS as STATIC_ALLERGENS } from '../data/products.jsx';
import { getIcon } from '../utils/iconMap';
import { loadLocalData, saveLocalData, startSync } from '../services/electronBridge';

const ProductContext = createContext();

// Localization helpers — call these anywhere you need language-aware text
export const getLocalizedName = (item, lang) => {
    if (!item) return '';
    if (lang === 'en' && item.name_en) return item.name_en;
    if (lang === 'pt' && item.name_pt) return item.name_pt;
    return item.name || '';
};

export const getLocalizedDesc = (item, lang) => {
    if (!item) return '';
    if (lang === 'en' && item.desc_en) return item.desc_en;
    if (lang === 'pt' && item.desc_pt) return item.desc_pt;
    return item.desc || '';
};

export const getLocalizedAllergenLabel = (allergen, lang) => {
    if (!allergen) return '';
    if (lang === 'en' && allergen.label_en) return allergen.label_en;
    if (lang === 'pt' && allergen.label_pt) return allergen.label_pt;
    return allergen.label || '';
};

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
};

export const ProductProvider = ({ children }) => {
    const [products, setProducts] = useState(STATIC_PRODUCTS);
    const [categories, setCategories] = useState(STATIC_CATEGORIES);
    // Allergens internally is an Object for O(1) access in UI, but we fetch as Array from DB
    const [allergens, setAllergens] = useState(STATIC_ALLERGENS);
    // We also keep the array version for Admin lists
    const [allergensList, setAllergensList] = useState([]);

    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAssetsCached, setAssetsCached] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncMessage, setSyncMessage] = useState('Iniciando...');

    // Helper to Convert DB Array -> Object Map
    const processAllergensData = (data) => {
        if (!data) return;
        const map = {};
        data.forEach(a => {
            map[a.id] = {
                label: a.label,
                label_en: a.label_en || null,
                label_pt: a.label_pt || null,
                icon: getIcon(a.icon || 'Alert') // Map string to Component
            };
        });
        setAllergens(map);
        setAllergensList(data);
    };

    const initializationRef = useRef(false);

    // ── Realtime: sincronizar cambios del catálogo en tiempo real ─────────
    // Cuando el admin modifica un producto o categoría desde Garum/AdminPage,
    // el kiosko lo refleja sin necesidad de reiniciar.
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel('catalog_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setProducts(prev => [...prev, payload.new].sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999)));
                } else if (payload.eventType === 'UPDATE') {
                    setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
                } else if (payload.eventType === 'DELETE') {
                    setProducts(prev => prev.filter(p => p.id !== payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setCategories(prev => [...prev, payload.new].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));
                } else if (payload.eventType === 'UPDATE') {
                    setCategories(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
                } else if (payload.eventType === 'DELETE') {
                    setCategories(prev => prev.filter(c => c.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // Initial fetch — Offline-first
    useEffect(() => {
        const fetchData = async () => {
            if (initializationRef.current) return;
            initializationRef.current = true;
            try {
                if (!supabase) return;

                // ── FASE 1: Cargar desde SQLite local al instante ─────────────────
                // Si hay datos en caché, el UI se muestra en < 10ms sin red.
                let hasLocalData = false;
                const [prodLocal, catLocal, allLocal] = await Promise.all([
                    loadLocalData('products'),
                    loadLocalData('categories'),
                    loadLocalData('allergens'),
                ]);

                if (prodLocal.data && prodLocal.data.length > 0) {
                    setProducts(prodLocal.data);
                    if (catLocal.data) setCategories(catLocal.data);
                    if (allLocal.data) processAllergensData(allLocal.data);
                    setLoading(false); // ← Mostrar UI al instante
                    setSyncMessage('Actualizando datos...');
                    setSyncProgress(20);
                    hasLocalData = true;
                }

                if (!hasLocalData) {
                    setSyncMessage('Cargando datos...');
                    setSyncProgress(10);
                }

                // ── FASE 2: Fetch desde Supabase en background ────────────────────
                // (no bloquea la UI si ya hay datos locales)
                const [
                    { data: prodData, error: prodError },
                    { data: catData, error: catError },
                    { data: allData, error: allError },
                    { data: settingsData },
                ] = await Promise.all([
                    supabase.from('products').select('*').order('order_index', { ascending: true }),
                    supabase.from('categories').select('*')
                        .order('order_index', { ascending: true })
                        .order('id', { ascending: true }),
                    supabase.from('allergens').select('*'),
                    supabase.from('settings').select('*'),
                ]);

                // Update settings state from DB
                if (settingsData) {
                    const settingsMap = {};
                    settingsData.forEach(s => settingsMap[s.key] = s.value);
                    setSettings(settingsMap);
                }

                setSyncProgress(50);

                // ── FASE 3: Sync de imágenes ──────────────────────────────────────
                const syncResult = await startSync((progress, message) => {
                    setSyncProgress(progress);
                    setSyncMessage(message);
                });

                if (syncResult.success) {
                    setSyncMessage('Sincronización completada');
                    // Solo usar local-asset:// si el sync fue exitoso
                    if (prodData) {
                        prodData.forEach(p => {
                            if (p.image && !p.image.startsWith('local-asset://')) {
                                p.image = `local-asset://${p.image}`;
                            }
                        });
                    }
                    if (catData) {
                        catData.forEach(c => {
                            if (c.image && !c.image.startsWith('local-asset://')) {
                                c.image = `local-asset://${c.image}`;
                            }
                        });
                    }
                } else {
                    setSyncMessage('Cargando desde la nube...');
                }

                setSyncProgress(100);

                // ── FASE 4: Guardar en SQLite para el próximo arranque ─────────
                // Guardamos datos RAW (sin prefijo local-asset://) para que
                // el próximo arranque offline pueda usar URLs remotas como fallback.
                await Promise.all([
                    saveLocalData('products',  prodData),
                    saveLocalData('categories', catData),
                    saveLocalData('allergens',  allData),
                ]);

                // ── FASE 5: Actualizar estado con datos frescos de Supabase ───────
                if (!prodError && prodData && prodData.length > 0) setProducts(prodData);
                if (!catError && catData && catData.length > 0) setCategories(catData);
                if (!allError && allData && allData.length > 0) processAllergensData(allData);

            } catch (err) {
                console.error('Unexpected error fetching data:', err);
                setSyncProgress(100);
            } finally {
                setLoading(false);
                // Desbloquear AppLoader una vez que la carga (o el intento) ha terminado
                setAssetsCached(true);
            }
        };

        fetchData();
    }, []);

    // --- PRODUCTS CRUD ---
    const addProduct = React.useCallback(async (newProduct) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([newProduct])
                .select();

            if (error) throw error;
            setProducts(prev => [...prev, ...data]);
            return { success: true };
        } catch (err) {
            console.error('Error adding product:', err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateProduct = React.useCallback(async (id, updates) => {
        try {
            const { error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
            return { success: true };
        } catch (err) {
            console.error('Error updating product:', err);
            return { success: false, error: err.message };
        }
    }, []);

    const deleteProduct = React.useCallback(async (id) => {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProducts(prev => prev.filter(p => p.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting product:', err);
            return { success: false, error: err.message };
        }
    }, []);

    const uploadImage = React.useCallback(async (file) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            return { success: true, url: data.publicUrl };
        } catch (error) {
            console.error('Error uploading image:', error);
            return { success: false, error: error.message };
        }
    }, []);

    // --- CATEGORIES CRUD ---
    const addCategory = React.useCallback(async (category) => {
        try {
            const { data, error } = await supabase.from('categories').insert([category]).select();
            if (error) throw error;
            setCategories(prev => [...prev, ...data]);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateCategory = React.useCallback(async (id, updates) => {
        try {
            const { error } = await supabase.from('categories').update(updates).eq('id', id);
            if (error) throw error;
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteCategory = React.useCallback(async (id) => {
        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            setCategories(prev => prev.filter(c => c.id !== id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const reorderCategories = React.useCallback(async (updates) => {
        try {
            const promises = updates.map(update =>
                supabase.from('categories').update({ order_index: update.order_index }).eq('id', update.id)
            );
            await Promise.all(promises);

            const updatesMap = new Map(updates.map(u => [u.id, u.order_index]));
            setCategories(prev => {
                const newCategories = prev.map(c =>
                    updatesMap.has(c.id) ? { ...c, order_index: updatesMap.get(c.id) } : c
                );
                return newCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            });

            return { success: true };
        } catch (err) {
            console.error('Error reordering categories:', err);
            return { success: false, error: err.message };
        }
    }, []);

    const reorderProducts = React.useCallback(async (updates) => {
        try {
            const promises = updates.map(update =>
                supabase.from('products').update({ order_index: update.order_index }).eq('id', update.id)
            );
            await Promise.all(promises);

            const updatesMap = new Map(updates.map(u => [u.id, u.order_index]));
            setProducts(prev => {
                const updated = prev.map(p =>
                    updatesMap.has(p.id) ? { ...p, order_index: updatesMap.get(p.id) } : p
                );
                return updated.sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999));
            });
            return { success: true };
        } catch (err) {
            console.error('Error reordering products:', err);
            return { success: false, error: err.message };
        }
    }, []);

    // --- ALLERGENS CRUD ---
    const addAllergen = React.useCallback(async (allergen) => {
        try {
            const { data, error } = await supabase.from('allergens').insert([allergen]).select();
            if (error) throw error;

            const newItem = data[0];
            const newItemList = [...allergensList, newItem];
            processAllergensData(newItemList);

            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [allergensList]);

    const updateAllergen = React.useCallback(async (id, updates) => {
        try {
            const { error } = await supabase.from('allergens').update(updates).eq('id', id);
            if (error) throw error;

            const updatedList = allergensList.map(a => a.id === id ? { ...a, ...updates } : a);
            processAllergensData(updatedList);

            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [allergensList]);

    const deleteAllergen = React.useCallback(async (id) => {
        try {
            const { error } = await supabase.from('allergens').delete().eq('id', id);
            if (error) throw error;

            const updatedList = allergensList.filter(a => a.id !== id);
            processAllergensData(updatedList);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [allergensList]);

    const updateSetting = React.useCallback(async (key, value) => {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key, value, updated_at: new Date().toISOString() });
            if (error) throw error;
            setSettings(prev => ({ ...prev, [key]: value }));
            return { success: true };
        } catch (err) {
            console.error('Error updating setting:', err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateProductFeatured = React.useCallback(async (id, isFeatured) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_featured: isFeatured })
                .eq('id', id);
            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === id ? { ...p, is_featured: isFeatured } : p));
            return { success: true };
        } catch (err) {
            console.error('Error updating product featured status:', err);
            return { success: false, error: err.message };
        }
    }, []);
    const value = React.useMemo(() => ({
        products,
        categories,
        allergens,
        allergensList,
        settings,
        loading,
        error,
        syncProgress,
        syncMessage,
        setSyncProgress,
        setSyncMessage,
        addProduct,
        updateProduct,
        deleteProduct,
        uploadImage,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        reorderProducts,
        addAllergen,
        updateAllergen,
        deleteAllergen,
        getLocalizedName,
        getLocalizedDesc,
        getLocalizedAllergenLabel,
        isAssetsCached,
        setAssetsCached,
        updateSetting,
        updateProductFeatured
    }), [
        products, categories, allergens, allergensList, settings, loading, error,
        syncProgress, syncMessage, addProduct, updateProduct, deleteProduct,
        uploadImage, addCategory, updateCategory, deleteCategory, reorderCategories,
        reorderProducts, addAllergen, updateAllergen, deleteAllergen,
        isAssetsCached, setAssetsCached, updateSetting, updateProductFeatured
    ]);

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    );
};
