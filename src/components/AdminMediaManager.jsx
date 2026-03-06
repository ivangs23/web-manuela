import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, Image, Film, RefreshCw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

const BUCKET = 'screensaver-media';
const ORDER_KEY = 'screensaver_order';

const saveOrder = (names) => {
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(names)); } catch (_) { }
};
const loadOrder = () => {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch (_) { return []; }
};
const applySavedOrder = (files) => {
    const order = loadOrder();
    if (!order.length) return files;
    const indexed = Object.fromEntries(order.map((n, i) => [n, i]));
    return [...files].sort((a, b) => (indexed[a.name] ?? 9999) - (indexed[b.name] ?? 9999));
};

const AdminMediaManager = () => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // ── Fetch ──────────────────────────────────────────────────────────
    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: err } = await supabase.storage.from(BUCKET).list('', {
                sortBy: { column: 'name', order: 'asc' }
            });
            if (err) throw err;
            const enriched = (data || [])
                .filter(f => f.name !== '.emptyFolderPlaceholder')
                .map(f => ({
                    ...f,
                    url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
                    isVideo: /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(f.name),
                }));
            setFiles(applySavedOrder(enriched));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFiles(); }, []);

    // ── Upload ─────────────────────────────────────────────────────────
    const handleUpload = async (e) => {
        const selected = Array.from(e.target.files);
        if (!selected.length) return;
        setUploading(true);
        setError(null);
        try {
            for (const file of selected) {
                const sanitized = file.name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9._\-]/g, '_');
                const safeName = `${Date.now()}_${sanitized}`;
                const { error: upErr } = await supabase.storage
                    .from(BUCKET)
                    .upload(safeName, file, { cacheControl: '3600', upsert: false });
                if (upErr) throw upErr;
            }
            await fetchFiles();
        } catch (e) {
            setError(e.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────
    const handleDelete = async (fileName) => {
        if (!window.confirm(`¿Eliminar este archivo?`)) return;
        const { error: delErr } = await supabase.storage.from(BUCKET).remove([fileName]);
        if (delErr) { setError(delErr.message); return; }
        const next = files.filter(f => f.name !== fileName);
        setFiles(next);
        saveOrder(next.map(f => f.name));
    };

    // ── Move (touch-friendly ordering) ────────────────────────────────
    const move = (idx, direction) => {
        const next = [...files];
        const target = idx + direction;
        if (target < 0 || target >= next.length) return;
        [next[idx], next[target]] = [next[target], next[idx]];
        setFiles(next);
        saveOrder(next.map(f => f.name));
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-4 gap-2">
                <div className="min-w-0">
                    <h2 className="text-lg font-serif font-black text-[#c28744]">Screensaver</h2>
                    <p className="text-[#9A7B6A] text-xs mt-0.5">
                        Sube fotos y vídeos · Usa ← → para cambiar el orden.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={fetchFiles} className="p-2 text-[#c28744] hover:bg-[#c28744]/10 rounded-lg transition-colors" title="Actualizar">
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 bg-[#c28744] hover:bg-[#a06830] text-[#12100B] px-3 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-60"
                    >
                        <Upload size={14} />
                        {uploading ? 'Subiendo...' : 'Añadir'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.mp4,.webm,.mov,.avi,.mkv,.m4v,.jpg,.jpeg,.png,.gif,.webp"
                        multiple
                        className="hidden"
                        onChange={handleUpload}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 mb-4 text-xs">
                    ⚠ {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-16 text-[#5A4033]">Cargando...</div>
            ) : files.length === 0 ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#c28744]/30 rounded-2xl py-16 flex flex-col items-center gap-3 text-[#5A4033] cursor-pointer hover:border-[#c28744]/60 hover:bg-[#c28744]/5 transition-colors"
                >
                    <Upload size={36} className="text-[#c28744]/50" />
                    <span className="font-bold text-sm">No hay medios todavía</span>
                    <span className="text-xs">Toca para subir fotos o vídeos</span>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {files.map((file, idx) => (
                        <div
                            key={file.name}
                            className="bg-[#1E150A] border border-[#c28744]/20 rounded-xl overflow-hidden relative"
                        >
                            {/* Order number */}
                            <div className="absolute top-2 left-2 z-10 bg-black/70 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold">
                                {idx + 1}
                            </div>

                            {/* Type badge */}
                            <div className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-md px-1.5 py-0.5 text-xs flex items-center gap-1">
                                {file.isVideo ? <Film size={9} /> : <Image size={9} />}
                                {file.isVideo ? 'Vídeo' : 'Foto'}
                            </div>

                            {/* Thumbnail */}
                            <div className="aspect-video bg-black overflow-hidden">
                                {file.isVideo ? (
                                    <video src={file.url} className="w-full h-full object-cover" muted preload="metadata" />
                                ) : (
                                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                )}
                            </div>

                            {/* Controls row */}
                            <div className="p-2 flex items-center justify-between gap-1">
                                {/* Move buttons — left / right */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => move(idx, -1)}
                                        disabled={idx === 0}
                                        className="w-8 h-8 flex items-center justify-center bg-[#2C1A0F] text-[#c28744] rounded-lg border border-[#c28744]/20 disabled:opacity-25 active:scale-90 transition-transform"
                                        title="Mover izquierda"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => move(idx, 1)}
                                        disabled={idx === files.length - 1}
                                        className="w-8 h-8 flex items-center justify-center bg-[#2C1A0F] text-[#c28744] rounded-lg border border-[#c28744]/20 disabled:opacity-25 active:scale-90 transition-transform"
                                        title="Mover derecha"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                {/* File info */}
                                <div className="min-w-0 flex-1 px-1">
                                    <p className="text-[#FFF8E7] text-xs truncate">{file.name.replace(/^\d+_/, '')}</p>
                                    {file.metadata?.size && (
                                        <p className="text-[#5A4033] text-xs">{formatSize(file.metadata.size)}</p>
                                    )}
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDelete(file.name)}
                                    className="w-8 h-8 flex items-center justify-center text-[#5A4033] hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors active:scale-90"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-[#5A4033] text-xs text-center mt-4">
                Fotos: 5 s · Vídeos: completo · ← → para reordenar
            </p>
        </div>
    );
};

export default AdminMediaManager;
