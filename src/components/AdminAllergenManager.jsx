import React, { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Edit2, Trash2, Save, X, ChevronDown } from 'lucide-react';
import { getIcon, AVAILABLE_ICONS } from '../utils/iconMap';

const LANGS = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'pt', flag: '🇵🇹', label: 'PT' },
];

const emptyAdd = { id: '', label: '', label_en: '', label_pt: '', icon: 'Alert' };

const IconSelector = ({ value, onChange }) => (
    <div className="relative group">
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full p-1 border border-gray-200 rounded-xl appearance-none bg-white pr-8 text-xs font-bold"
        >
            {AVAILABLE_ICONS.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
            ))}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={13} />
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-600">
            {getIcon(value)}
        </div>
    </div>
);

const LangTabs = ({ active, onChange }) => (
    <div className="flex gap-1 bg-[#2C1A0F]/10 p-1 rounded-full w-fit mb-2 border border-[#c28744]/20">
        {LANGS.map(l => (
            <button
                key={l.code}
                type="button"
                onClick={() => onChange(l.code)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${active === l.code ? 'bg-[#c28744] text-[#12100B] shadow-sm' : 'text-[#5A4033] hover:bg-[#c28744]/10'}`}
            >
                {l.flag} {l.label}{l.code === 'es' && <span className="opacity-50 text-[8px] ml-0.5">*</span>}
            </button>
        ))}
    </div>
);

const AdminAllergenManager = () => {
    const { allergensList, addAllergen, updateAllergen, deleteAllergen } = useProducts();
    const { t } = useLanguage();
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ id: '', label: '', label_en: '', label_pt: '', icon: '' });
    const [editLang, setEditLang] = useState('es');
    const [isAdding, setIsAdding] = useState(false);
    const [addForm, setAddForm] = useState(emptyAdd);
    const [addLang, setAddLang] = useState('es');

    const startEdit = (al) => {
        setEditingId(al.id);
        setEditForm({
            id: al.id,
            label: al.label || '',
            label_en: al.label_en || '',
            label_pt: al.label_pt || '',
            icon: al.icon || 'Alert'
        });
        setEditLang('es');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ id: '', label: '', label_en: '', label_pt: '', icon: '' });
    };

    const saveEdit = async () => {
        await updateAllergen(editForm.id, {
            label: editForm.label,
            label_en: editForm.label_en,
            label_pt: editForm.label_pt,
            icon: editForm.icon
        });
        setEditingId(null);
    };

    const handleAdd = async () => {
        if (!addForm.id || !addForm.label) return alert('ID y Etiqueta (ES) son obligatorios');
        if (allergensList.some(a => a.id === addForm.id)) return alert('El ID ya existe');
        await addAllergen(addForm);
        setIsAdding(false);
        setAddForm(emptyAdd);
        setAddLang('es');
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar alérgeno?')) {
            await deleteAllergen(id);
        }
    };

    const getLabelField = (lang) => lang === 'es' ? 'label' : `label_${lang}`;

    return (
        <div className="bg-[#FFF8E7] rounded-2xl shadow-sm border border-[#c28744]/20 p-4 md:p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h3 className="text-lg font-serif font-black text-[#2C1A0F]">Gestionar Alérgenos</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-[#2C1A0F] text-[#c28744] px-4 py-2 rounded-full text-xs font-bold hover:bg-[#3E2515] transition-all border border-[#c28744]/20 shadow-sm active:scale-95"
                >
                    <Plus size={14} /> {t('add')}
                </button>
            </div>

            {isAdding && (
                <div className="mb-6 p-4 bg-[#c28744]/10 rounded-lg border border-[#c28744]/20">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-xs font-bold text-[#5A4033] mb-1">ID (código) *</label>
                            <input
                                type="text"
                                placeholder="ej: gluten"
                                value={addForm.id}
                                onChange={e => setAddForm({ ...addForm, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#5A4033] mb-1">Icono</label>
                            <IconSelector value={addForm.icon} onChange={v => setAddForm({ ...addForm, icon: v })} />
                        </div>
                    </div>
                    <LangTabs active={addLang} onChange={setAddLang} />
                    <div className="mb-3">
                        <label className="block text-xs font-bold text-[#5A4033] mb-1">
                            Etiqueta {addLang !== 'es' ? `(${LANGS.find(l => l.code === addLang)?.flag} opcional)` : '(ES) *'}
                        </label>
                        <input
                            type="text"
                            placeholder={addLang === 'es' ? 'Ej: Gluten' : `Nombre en ${LANGS.find(l => l.code === addLang)?.label}`}
                            value={addForm[getLabelField(addLang)]}
                            onChange={e => setAddForm({ ...addForm, [getLabelField(addLang)]: e.target.value })}
                            className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-bold">
                            <Save size={16} /> Guardar
                        </button>
                        <button onClick={() => { setIsAdding(false); setAddForm(emptyAdd); }} className="bg-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-300">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                {allergensList.map(al => (
                    <div key={al.id} className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-[#c28744]/10 group shadow-sm hover:border-[#c28744]/40 transition-all">
                        {editingId === al.id ? (
                            <div className="flex-1">
                                <div className="mb-2">
                                    <IconSelector value={editForm.icon} onChange={v => setEditForm(prev => ({ ...prev, icon: v }))} />
                                </div>
                                <LangTabs active={editLang} onChange={setEditLang} />
                                <input
                                    type="text"
                                    placeholder={editLang !== 'es' ? `Etiqueta en ${LANGS.find(l => l.code === editLang)?.label} (opcional)` : 'Etiqueta ES *'}
                                    value={editForm[getLabelField(editLang)]}
                                    onChange={e => setEditForm(prev => ({ ...prev, [getLabelField(editLang)]: e.target.value }))}
                                    className="w-full p-2 border border-[#c28744]/30 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#c28744] outline-none mb-2"
                                />
                                <div className="flex gap-2">
                                    <button onClick={saveEdit} className="flex items-center gap-1 text-green-600 hover:bg-green-100 px-2 py-1 rounded text-sm font-bold">
                                        <Save size={14} /> Guardar
                                    </button>
                                    <button onClick={cancelEdit} className="text-gray-400 hover:bg-gray-200 px-2 py-1 rounded">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[#FFF8E7] p-1.5 rounded-full border border-[#c28744]/20 text-[#c28744] shrink-0">
                                    {getIcon(al.icon || 'Alert', 16)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-bold text-[#2C1A0F] text-xs truncate">{al.label}</span>
                                        <span className="text-[10px] text-[#5A4033]/50 font-mono">#{al.id}</span>
                                    </div>
                                    <div className="flex gap-1 mt-0.5 flex-wrap">
                                        {al.label_en && <span className="text-[9px] bg-blue-50/50 text-blue-600 px-1.5 py-0.5 rounded-full">EN</span>}
                                        {al.label_pt && <span className="text-[9px] bg-green-50/50 text-green-600 px-1.5 py-0.5 rounded-full">PT</span>}
                                    </div>
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => startEdit(al)} className="text-blue-500 hover:bg-blue-50 p-1 rounded-lg"><Edit2 size={13} /></button>
                                    <button onClick={() => handleDelete(al.id)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg"><Trash2 size={13} /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminAllergenManager;
