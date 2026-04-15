import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { supabase } from '../lib/supabase';
import { Plus, Save, X, Trash2, Edit2, Printer, Star, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Helper: construir árbol de categorías ───────────────────────────
const buildCategoryTree = (categories) => {
    const roots = categories.filter(c => !c.parent_id)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const getChildren = (parentId) => categories
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const buildNode = (cat) => ({
        ...cat,
        children: getChildren(cat.id).map(buildNode),
    });

    return roots.map(buildNode);
};

// ─── Helper: obtener todos los IDs descendientes ─────────────────────
const getAllDescendantIds = (categories, rootId) => {
    let ids = [];
    const children = categories.filter(c => c.parent_id === rootId);
    for (const child of children) {
        ids.push(child.id);
        ids = ids.concat(getAllDescendantIds(categories, child.id));
    }
    return ids;
};

// ─── Subcomponente: Formulario de impresora ──────────────────────────
const PrinterForm = ({ printer, onSave, onCancel }) => {
    const [form, setForm] = useState({
        name: printer?.name || '',
        ip: printer?.ip || '',
        port: printer?.port || 9100,
        type: printer?.type || 'EPSON',
        is_default: printer?.is_default || false,
        enabled: printer?.enabled ?? true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.ip.trim()) return;
        onSave(form);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-[#1E150A] border border-[#c28744]/20 rounded-xl p-5 mb-4">
            <h4 className="text-[#c28744] font-bold mb-4">
                {printer ? 'Editar Impresora' : 'Nueva Impresora'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-bold text-[#9A7B6A] mb-1">Nombre *</label>
                    <input
                        type="text"
                        placeholder="Ej: Cocina, Barra..."
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full p-2.5 bg-[#2C1A0F] border border-[#c28744]/30 rounded-lg text-[#FFF8E7] text-sm focus:ring-2 focus:ring-[#c28744] outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#9A7B6A] mb-1">IP *</label>
                    <input
                        type="text"
                        placeholder="Ej: 192.168.1.122"
                        value={form.ip}
                        onChange={e => setForm({ ...form, ip: e.target.value })}
                        className="w-full p-2.5 bg-[#2C1A0F] border border-[#c28744]/30 rounded-lg text-[#FFF8E7] text-sm focus:ring-2 focus:ring-[#c28744] outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#9A7B6A] mb-1">Puerto</label>
                    <input
                        type="number"
                        value={form.port}
                        onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 9100 })}
                        className="w-full p-2.5 bg-[#2C1A0F] border border-[#c28744]/30 rounded-lg text-[#FFF8E7] text-sm focus:ring-2 focus:ring-[#c28744] outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#9A7B6A] mb-1">Tipo</label>
                    <select
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        className="w-full p-2.5 bg-[#2C1A0F] border border-[#c28744]/30 rounded-lg text-[#FFF8E7] text-sm focus:ring-2 focus:ring-[#c28744] outline-none"
                    >
                        <option value="EPSON">EPSON</option>
                        <option value="STAR">STAR</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-6 mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.is_default}
                        onChange={e => setForm({ ...form, is_default: e.target.checked })}
                        className="w-4 h-4 accent-[#c28744]"
                    />
                    <span className="text-sm text-[#FFF8E7]">Impresora por defecto</span>
                    <Star size={14} className="text-[#c28744]" />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={e => setForm({ ...form, enabled: e.target.checked })}
                        className="w-4 h-4 accent-[#c28744]"
                    />
                    <span className="text-sm text-[#FFF8E7]">Habilitada</span>
                </label>
            </div>

            <div className="flex gap-2">
                <button type="submit" className="flex items-center gap-2 bg-[#c28744] text-[#12100B] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#d4a060] transition-colors">
                    <Save size={16} /> Guardar
                </button>
                <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-[#2C1A0F] text-[#9A7B6A] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#3E2515] transition-colors border border-[#c28744]/20">
                    <X size={16} /> Cancelar
                </button>
            </div>
        </form>
    );
};

// ─── Subcomponente: Categoría asignable (con hijos visuales) ─────────
const CategoryAssignNode = ({ node, level = 0, assignedMap, onAssign, printers }) => {
    const [expanded, setExpanded] = useState(level === 0);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div>
            <div
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#c28744]/5 transition-colors group"
                style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
            >
                {hasChildren ? (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[#c28744]/60 hover:text-[#c28744] transition-colors p-0.5"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span className="w-5" />
                )}

                {node.image ? (
                    <img src={node.image} className="w-6 h-6 rounded-full object-cover border border-[#c28744]/20" alt="" />
                ) : (
                    <span className="text-sm">{node.icon || '📁'}</span>
                )}

                <span className={`text-sm flex-1 ${level === 0 ? 'font-bold text-[#FFF8E7]' : 'text-[#FFF8E7]/80'}`}>
                    {node.name}
                </span>

                <select
                    value={assignedMap[node.id] || ''}
                    onChange={e => onAssign(node.id, e.target.value || null)}
                    className={`text-xs px-2 py-1 rounded-lg border outline-none transition-colors ${
                        assignedMap[node.id]
                            ? 'bg-[#c28744]/20 border-[#c28744]/40 text-[#c28744] font-bold'
                            : 'bg-[#2C1A0F] border-[#c28744]/10 text-[#9A7B6A]'
                    }`}
                >
                    <option value="">— Hereda del padre —</option>
                    {printers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {hasChildren && expanded && (
                <div>
                    {node.children.map(child => (
                        <CategoryAssignNode
                            key={child.id}
                            node={child}
                            level={level + 1}
                            assignedMap={assignedMap}
                            onAssign={onAssign}
                            printers={printers}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


// ─── Componente principal ────────────────────────────────────────────
const AdminPrinterManager = () => {
    const { categories } = useProducts();
    const [printers, setPrinters] = useState([]);
    const [categoryMap, setCategoryMap] = useState({}); // { categoryId: printerId }
    const [loading, setLoading] = useState(true);
    const [editingPrinter, setEditingPrinter] = useState(null); // null | 'new' | printerObject
    const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'

    // ─── Fetch data ──────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: printersData }, { data: mapData }] = await Promise.all([
                supabase.from('printers').select('*').order('created_at'),
                supabase.from('category_printer_map').select('*'),
            ]);

            if (printersData) setPrinters(printersData);
            if (mapData) {
                const map = {};
                mapData.forEach(m => { map[m.category_id] = m.printer_id; });
                setCategoryMap(map);
            }
        } catch (err) {
            console.error('Error fetching printer data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Printer CRUD ────────────────────────────────────────────────
    const savePrinter = async (formData) => {
        try {
            if (editingPrinter && editingPrinter !== 'new') {
                // Si se marca como default, quitar default de las demás
                if (formData.is_default) {
                    await supabase.from('printers').update({ is_default: false }).neq('id', editingPrinter.id);
                }
                const { error } = await supabase.from('printers').update(formData).eq('id', editingPrinter.id);
                if (error) throw error;
            } else {
                if (formData.is_default) {
                    await supabase.from('printers').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
                }
                const { error } = await supabase.from('printers').insert([formData]);
                if (error) throw error;
            }
            setEditingPrinter(null);
            await fetchData();
        } catch (err) {
            console.error('Error saving printer:', err);
            alert('Error al guardar la impresora: ' + err.message);
        }
    };

    const deletePrinter = async (id) => {
        if (!window.confirm('¿Eliminar esta impresora? Se eliminarán también sus asignaciones de categorías.')) return;
        try {
            const { error } = await supabase.from('printers').delete().eq('id', id);
            if (error) throw error;
            await fetchData();
        } catch (err) {
            console.error('Error deleting printer:', err);
            alert('Error al eliminar: ' + err.message);
        }
    };

    // ─── Category assignment ─────────────────────────────────────────
    const handleAssign = async (categoryId, printerId) => {
        setSaveStatus('saving');
        try {
            if (printerId) {
                // Upsert: insertar o actualizar
                const { error } = await supabase
                    .from('category_printer_map')
                    .upsert({ category_id: categoryId, printer_id: printerId }, { onConflict: 'category_id' });
                if (error) throw error;
                setCategoryMap(prev => ({ ...prev, [categoryId]: printerId }));
            } else {
                // Eliminar asignación
                const { error } = await supabase
                    .from('category_printer_map')
                    .delete()
                    .eq('category_id', categoryId);
                if (error) throw error;
                setCategoryMap(prev => {
                    const next = { ...prev };
                    delete next[categoryId];
                    return next;
                });
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 2000);
        } catch (err) {
            console.error('Error assigning category:', err);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    // ─── Build category tree ─────────────────────────────────────────
    const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

    // ─── Resumen: qué categorías van a cada impresora ────────────────
    const printerSummary = useMemo(() => {
        const summary = {};
        printers.forEach(p => { summary[p.id] = { printer: p, directCategories: [], inheritedCount: 0 }; });

        // Categorías asignadas directamente
        Object.entries(categoryMap).forEach(([catId, printerId]) => {
            const cat = categories.find(c => c.id === catId);
            if (cat && summary[printerId]) {
                summary[printerId].directCategories.push(cat);
                // Contar descendientes que heredan
                const descendants = getAllDescendantIds(categories, catId);
                summary[printerId].inheritedCount += descendants.length;
            }
        });

        return summary;
    }, [printers, categoryMap, categories]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#c28744] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-serif font-black text-[#c28744]">Gestionar Impresoras</h2>
                    <p className="text-[#9A7B6A] text-sm mt-1">
                        Configura las impresoras y asigna qué categorías se imprimen en cada una. Las subcategorías heredan la impresora del padre automáticamente.
                    </p>
                </div>
                {saveStatus && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        saveStatus === 'saving' ? 'bg-yellow-500/20 text-yellow-400' :
                        saveStatus === 'saved' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                        {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Error'}
                    </span>
                )}
            </div>

            {/* ─── Sección: Impresoras ──────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[#FFF8E7] font-bold text-sm uppercase tracking-wider">Impresoras</h3>
                    <button
                        onClick={() => setEditingPrinter('new')}
                        className="flex items-center gap-2 bg-[#2C1A0F] text-[#c28744] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#3E2515] transition-colors border border-[#c28744]/20"
                    >
                        <Plus size={16} /> Añadir
                    </button>
                </div>

                {editingPrinter === 'new' && (
                    <PrinterForm onSave={savePrinter} onCancel={() => setEditingPrinter(null)} />
                )}

                {printers.length === 0 && !editingPrinter ? (
                    <div className="text-center py-8 bg-[#1E150A] rounded-xl border border-[#c28744]/10">
                        <Printer size={40} className="text-[#c28744]/30 mx-auto mb-3" />
                        <p className="text-[#9A7B6A] text-sm">No hay impresoras configuradas.</p>
                        <p className="text-[#9A7B6A] text-xs mt-1">Añade una impresora para empezar a asignar categorías.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {printers.map(p => (
                            <div key={p.id} className="relative">
                                {editingPrinter?.id === p.id ? (
                                    <PrinterForm
                                        printer={p}
                                        onSave={savePrinter}
                                        onCancel={() => setEditingPrinter(null)}
                                    />
                                ) : (
                                    <div className={`bg-[#1E150A] border rounded-xl p-4 transition-all ${
                                        p.enabled ? 'border-[#c28744]/20' : 'border-red-500/20 opacity-60'
                                    }`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Printer size={18} className={p.enabled ? 'text-[#c28744]' : 'text-red-400'} />
                                                <span className="font-bold text-[#FFF8E7]">{p.name}</span>
                                                {p.is_default && (
                                                    <span className="text-[10px] bg-[#c28744]/20 text-[#c28744] px-2 py-0.5 rounded-full font-bold">
                                                        POR DEFECTO
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setEditingPrinter(p)}
                                                    className="p-1.5 text-[#9A7B6A] hover:text-[#c28744] hover:bg-[#c28744]/10 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deletePrinter(p.id)}
                                                    className="p-1.5 text-[#9A7B6A] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-xs text-[#9A7B6A] space-y-1">
                                            <p>{p.ip}:{p.port} · {p.type}</p>
                                            {printerSummary[p.id] && (
                                                <p className="text-[#c28744]/70">
                                                    {printerSummary[p.id].directCategories.length} categoría(s) asignada(s)
                                                    {printerSummary[p.id].inheritedCount > 0 && (
                                                        <span> · {printerSummary[p.id].inheritedCount} subcategoría(s) heredan</span>
                                                    )}
                                                </p>
                                            )}
                                        </div>

                                        {/* Mini-lista de categorías asignadas */}
                                        {printerSummary[p.id]?.directCategories.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {printerSummary[p.id].directCategories.map(cat => (
                                                    <span key={cat.id} className="text-[10px] bg-[#c28744]/10 text-[#c28744] px-2 py-0.5 rounded-full">
                                                        {cat.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Sección: Asignación de categorías ──────────────── */}
            {printers.length > 0 && (
                <div>
                    <h3 className="text-[#FFF8E7] font-bold text-sm uppercase tracking-wider mb-1">
                        Asignar Categorías a Impresoras
                    </h3>
                    <p className="text-[#9A7B6A] text-xs mb-4">
                        Asigna solo las categorías padre. Todas las subcategorías y productos dentro heredarán la misma impresora automáticamente.
                        Si no asignas una categoría, usará la impresora por defecto.
                    </p>

                    <div className="bg-[#1E150A] border border-[#c28744]/10 rounded-xl p-4">
                        {categoryTree.map(rootNode => (
                            <CategoryAssignNode
                                key={rootNode.id}
                                node={rootNode}
                                level={0}
                                assignedMap={categoryMap}
                                onAssign={handleAssign}
                                printers={printers}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPrinterManager;
