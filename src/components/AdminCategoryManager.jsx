import React, { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';

const LANGS = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'pt', flag: '🇵🇹', label: 'PT' },
];

const emptyForm = { id: '', name: '', name_en: '', name_pt: '', icon: '🌟', image: '', parent_id: '', order_index: 0 };

const AdminCategoryManager = () => {
    const { categories, addCategory, updateCategory, deleteCategory, uploadImage, reorderCategories } = useProducts();
    const { t } = useLanguage();
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(emptyForm);
    const [editImageFile, setEditImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [editLang, setEditLang] = useState('es');
    const [isAdding, setIsAdding] = useState(false);
    const [addForm, setAddForm] = useState(emptyForm);
    const [addImageFile, setAddImageFile] = useState(null);
    const [addImagePreview, setAddImagePreview] = useState(null);
    const [addLang, setAddLang] = useState('es');

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditForm({
            id: cat.id,
            name: cat.name || '',
            name_en: cat.name_en || '',
            name_pt: cat.name_pt || '',
            image: cat.image || '',
            parent_id: cat.parent_id || ''
        });
        setEditImageFile(null);
        setEditImagePreview(cat.image || null);
        setEditLang('es');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(emptyForm);
        setEditImageFile(null);
        setEditImagePreview(null);
    };

    const handleImageChange = (e, isEdit = false) => {
        const file = e.target.files[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            if (isEdit) {
                setEditImageFile(file);
                setEditImagePreview(previewUrl);
            } else {
                setAddImageFile(file);
                setAddImagePreview(previewUrl);
            }
        }
    };

    const saveEdit = async () => {
        let imageUrl = editForm.image;

        if (editImageFile) {
            const uploadResult = await uploadImage(editImageFile);
            if (!uploadResult.success) {
                alert('Error subiendo imagen: ' + uploadResult.error);
                return;
            }
            imageUrl = uploadResult.url;
        }

        await updateCategory(editForm.id, {
            name: editForm.name,
            name_en: editForm.name_en,
            name_pt: editForm.name_pt,
            image: imageUrl,
            parent_id: editForm.parent_id || null
        });
        cancelEdit();
    };

    const handleAdd = async () => {
        if (!addForm.id || !addForm.name) return alert('ID y Nombre (ES) son obligatorios');
        if (categories.some(c => c.id === addForm.id)) return alert('El ID ya existe');

        let imageUrl = addForm.image;

        if (addImageFile) {
            const uploadResult = await uploadImage(addImageFile);
            if (!uploadResult.success) {
                alert('Error subiendo imagen: ' + uploadResult.error);
                return;
            }
            imageUrl = uploadResult.url;
        }

        const lastIndex = categories.reduce((max, c) => Math.max(max, c.order_index || 0), -1);
        const newCat = { ...addForm, image: imageUrl, order_index: lastIndex + 1 };
        if (!newCat.parent_id) newCat.parent_id = null; // Ensure empty string becomes null

        await addCategory(newCat);
        setIsAdding(false);
        setAddForm(emptyForm);
        setAddImageFile(null);
        setAddImagePreview(null);
        setAddLang('es');
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar categoría? Los productos asociados podrían quedar huérfanos.')) {
            await deleteCategory(id);
        }
    };

    const handleReorder = async (category, direction) => {
        // Find siblings (same parent_id)
        const siblings = categories.filter(c => c.parent_id === category.parent_id)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const currentIndex = siblings.findIndex(c => c.id === category.id);
        if (currentIndex === -1) return;

        let swapIndex = -1;
        if (direction === 'up' && currentIndex > 0) {
            swapIndex = currentIndex - 1;
        } else if (direction === 'down' && currentIndex < siblings.length - 1) {
            swapIndex = currentIndex + 1;
        }

        if (swapIndex !== -1) {
            // Re-assign order indexes to ALL siblings just to be absolutely safe
            // and eliminate any duplicate index bugs from initial nulls
            const currentCatId = siblings[currentIndex].id;
            const swapCatId = siblings[swapIndex].id;

            // Swap them in the array
            const newSiblings = [...siblings];
            [newSiblings[currentIndex], newSiblings[swapIndex]] = [newSiblings[swapIndex], newSiblings[currentIndex]];

            const updates = newSiblings.map((c, index) => ({
                id: c.id,
                order_index: index * 10
            }));

            await reorderCategories(updates);
        }
    };

    const LangTabs = ({ active, onChange }) => (
        <div className="flex gap-1 bg-[#2C1A0F]/10 p-0.5 rounded-lg w-fit mb-3 border border-[#c28744]/20">
            {LANGS.map(l => (
                <button
                    key={l.code}
                    type="button"
                    onClick={() => onChange(l.code)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${active === l.code ? 'bg-[#c28744] text-[#12100B] shadow' : 'text-[#5A4033] hover:bg-[#c28744]/10'}`}
                >
                    {l.flag} {l.label}{l.code === 'es' && <span className="opacity-50">*</span>}
                </button>
            ))}
        </div>
    );

    // Group categories by parent
    const rootCategories = categories
        .filter(c => !c.parent_id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const getSubcategories = (parentId) => categories
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const getCategoryOptions = (cats, parentId = null, prefix = '') => {
        let result = [];
        const children = cats
            .filter(c => (c.parent_id || null) === (parentId || null))
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        for (const child of children) {
            result.push({ id: child.id, name: prefix + child.name });
            result = result.concat(getCategoryOptions(cats, child.id, prefix + '\u00A0\u00A0\u00A0\u00A0\u2514 '));
        }
        return result;
    };

    const categoryOptions = getCategoryOptions(categories);

    const getDescendantsIds = (cats, rootId) => {
        let ids = [];
        const children = cats.filter(c => c.parent_id === rootId);
        for (const child of children) {
            ids.push(child.id);
            ids = ids.concat(getDescendantsIds(cats, child.id));
        }
        return ids;
    };

    const renderCategory = (cat, level = 0) => {
        const subs = getSubcategories(cat.id);
        const isRoot = level === 0;
        const invalidParentIds = [cat.id, ...getDescendantsIds(categories, cat.id)];

        return (
            <React.Fragment key={cat.id}>
                <div
                    className={`flex items-start gap-4 p-3 group shadow-sm transition-all duration-300 ${isRoot ? 'bg-white rounded-lg border border-[#c28744]/10 mt-2' : 'bg-white/60 rounded-lg border-l-4 border-l-[#c28744] border-t border-r border-b border-[#c28744]/10 mt-1'}`}
                    style={level > 0 ? { marginLeft: `${level * 2}rem` } : {}}
                >
                    {editingId === cat.id ? (
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        {editImagePreview && (
                                            <div className="w-10 h-10 rounded overflow-hidden border border-gray-200 shrink-0">
                                                <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageChange(e, true)}
                                            className="w-full text-xs text-slate-500
                                                file:mr-2 file:py-1 file:px-2
                                                file:rounded file:border-0
                                                file:text-xs file:font-semibold
                                                file:bg-amber-50 file:text-amber-700
                                                hover:file:bg-amber-100"
                                        />
                                    </div>
                                </div>
                                <span className="text-xs text-[#5A4033] font-mono ml-auto">#{cat.id}</span>
                            </div>
                            <LangTabs active={editLang} onChange={setEditLang} />
                            <input
                                type="text"
                                placeholder={editLang !== 'es' ? `Nombre en ${LANGS.find(l => l.code === editLang)?.label} (opcional)` : 'Nombre ES *'}
                                value={editLang === 'es' ? editForm.name : editLang === 'en' ? editForm.name_en : editForm.name_pt}
                                onChange={e => {
                                    const key = editLang === 'es' ? 'name' : `name_${editLang}`;
                                    setEditForm({ ...editForm, [key]: e.target.value });
                                }}
                                className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none mb-2"
                            />
                            <div className="mb-3">
                                <label className="block text-xs font-bold text-[#5A4033] mb-1">Categoría Padre</label>
                                <select
                                    value={editForm.parent_id || ''}
                                    onChange={e => setEditForm({ ...editForm, parent_id: e.target.value })}
                                    className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none"
                                >
                                    <option value="">Ninguna (Principal)</option>
                                    {categoryOptions.filter(c => !invalidParentIds.includes(c.id)).map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={saveEdit} className="flex items-center gap-1 text-green-600 hover:bg-green-100 px-2 py-1 rounded text-sm font-bold">
                                    <Save size={16} /> Guardar
                                </button>
                                <button onClick={cancelEdit} className="text-gray-400 hover:bg-gray-200 px-2 py-1 rounded">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`${isRoot ? 'w-12 h-12 text-2xl' : 'w-10 h-10 text-xl'} flex items-center justify-center bg-[#FFF8E7] rounded-full shadow-sm border border-[#c28744]/20 shrink-0 overflow-hidden`}>
                                {cat.image ? (
                                    <img src={cat.image} className="w-full h-full object-cover" alt={cat.name} />
                                ) : (
                                    <span className="text-gray-400 text-xs text-center leading-none">No img</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <span className={`font-bold text-[#2C1A0F] ${isRoot ? '' : 'text-sm'}`}>{cat.name}</span>
                                <span className="text-xs text-[#5A4033] ml-2 font-mono">#{cat.id}</span>
                                <div className="flex gap-2 mt-1">
                                    {cat.name_en && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🇬🇧 {cat.name_en}</span>}
                                    {cat.name_pt && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">🇵🇹 {cat.name_pt}</span>}
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleReorder(cat, 'up')} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded"><ArrowUp size={16} /></button>
                                <button onClick={() => handleReorder(cat, 'down')} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded"><ArrowDown size={16} /></button>
                                <button onClick={() => startEdit(cat)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                            </div>
                        </>
                    )}
                </div>
                {subs.length > 0 && (
                    <div className="flex flex-col">
                        {subs.map(sub => renderCategory(sub, level + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    return (
        <div className="bg-[#FFF8E7] rounded-xl shadow-sm border border-[#c28744]/20 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Gestionar Categorías</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-[#2C1A0F] text-[#c28744] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#3E2515] transition-colors border border-[#c28744]/20"
                >
                    <Plus size={16} /> {t('add')}
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-[#c28744]/10 rounded-lg border border-[#c28744]/20">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-3">
                        <div>
                            <label className="block text-xs font-bold text-[#5A4033] mb-1">ID (identificador) *</label>
                            <input
                                type="text"
                                placeholder="ej: bebidas"
                                value={addForm.id}
                                onChange={e => setAddForm({ ...addForm, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none"
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-[#5A4033] mb-1">Imagen</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange(e, false)}
                                    className="w-full text-xs text-slate-500
                                        file:mr-2 file:py-1 file:px-2
                                        file:rounded file:border-0
                                        file:text-xs file:font-semibold
                                        file:bg-amber-50 file:text-amber-700
                                        hover:file:bg-amber-100"
                                />
                                {addImagePreview && (
                                    <div className="w-10 h-10 rounded overflow-hidden border border-gray-200">
                                        <img src={addImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-[#5A4033] mb-1">Categoría Padre</label>
                            <select
                                value={addForm.parent_id}
                                onChange={e => setAddForm({ ...addForm, parent_id: e.target.value })}
                                className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none"
                            >
                                <option value="">Ninguna (Principal)</option>
                                {categoryOptions.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <LangTabs active={addLang} onChange={setAddLang} />
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-[#5A4033] mb-1">
                            Nombre {addLang !== 'es' ? `(${LANGS.find(l => l.code === addLang)?.flag} opcional)` : '(ES) *'}
                        </label>
                        <input
                            type="text"
                            placeholder={addLang === 'es' ? 'Ej: Bebidas Frías' : `Nombre en ${LANGS.find(l => l.code === addLang)?.label}`}
                            value={addLang === 'es' ? addForm.name : addLang === 'en' ? addForm.name_en : addForm.name_pt}
                            onChange={e => {
                                const key = addLang === 'es' ? 'name' : `name_${addLang}`;
                                setAddForm({ ...addForm, [key]: e.target.value });
                            }}
                            className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-bold">
                            <Save size={16} /> Guardar
                        </button>
                        <button onClick={() => { setIsAdding(false); setAddForm(emptyForm); setAddImageFile(null); setAddImagePreview(null); }} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm font-bold">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col">
                {rootCategories.map(cat => renderCategory(cat, 0))}
            </div>
        </div>
    );
};

export default AdminCategoryManager;
