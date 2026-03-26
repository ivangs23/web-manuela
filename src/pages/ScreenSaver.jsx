import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo.png';

const BUCKET = 'screensaver-media';
const IMAGE_DURATION = 5000;
const ORDER_KEY = 'screensaver_order';

// Module-level cache: url -> blob URL. Persists for the lifetime of the app.
const videoBlobCache = new Map();

// Detect MIME type from file extension
const getMimeType = (url) => {
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    const map = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska', m4v: 'video/mp4' };
    return map[ext] || 'video/mp4';
};

const applySavedOrder = (items) => {
    try {
        const order = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
        if (!order.length) return items;
        const indexed = Object.fromEntries(order.map((n, i) => [n, i]));
        return [...items].sort((a, b) => (indexed[a.name] ?? 9999) - (indexed[b.name] ?? 9999));
    } catch (_) { return items; }
};

const ScreenSaver = ({ onDismiss }) => {
    const [media, setMedia] = useState([]);
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [blobUrl, setBlobUrl] = useState(null);   // blob URL for current video
    const [logoLoaded, setLogoLoaded] = useState(false);
    const timerRef = useRef(null);
    const dismissedRef = useRef(false);

    // ── Fetch media list from Supabase ─────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await supabase.storage.from(BUCKET).list('', {
                    sortBy: { column: 'name', order: 'asc' }
                });
                let items = (data || [])
                    .filter(f => f.name !== '.emptyFolderPlaceholder')
                    .map(f => ({
                        url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
                        isVideo: /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(f.name),
                        name: f.name,
                    }));



                setMedia(applySavedOrder(items));
            } catch (e) {
                console.warn('[Screensaver] fetch list failed:', e);
            }
            setLoaded(true);
        };
        load();
    }, []);

    // ── Advance using ref-stored media length ─────────────────────────
    const mediaLenRef = useRef(0);
    useEffect(() => { mediaLenRef.current = media.length; }, [media]);

    const advanceSafe = useCallback(() => {
        clearTimeout(timerRef.current);
        setVisible(false);
        setTimeout(() => {
            setIndex(prev => (prev + 1) % (mediaLenRef.current || 1));
            setVisible(true);
        }, 350);
    }, []);

    // ── Current item ──────────────────────────────────────────────────
    const current = loaded && media.length > 0 ? media[index] : null;

    // ── Image timer ────────────────────────────────────────────────────
    useEffect(() => {
        if (!current || current.isVideo) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(advanceSafe, IMAGE_DURATION);
        return () => clearTimeout(timerRef.current);
    }, [current, advanceSafe]);

    // ── Prefetch siguiente imagen para que cargue sin espera ───────────
    useEffect(() => {
        if (!current || current.isVideo || media.length < 2) return;
        const next = media[(index + 1) % media.length];
        if (next && !next.isVideo) {
            const img = new window.Image();
            img.src = next.url;
        }
    }, [current, index, media]);

    // ── Fetch video as blob for reliable MIME + local playback ─────────
    useEffect(() => {
        if (!current?.isVideo) {
            setBlobUrl(null);
            return;
        }

        // Serve from cache immediately if already fetched
        if (videoBlobCache.has(current.url)) {
            setBlobUrl(videoBlobCache.get(current.url));
            return;
        }

        let cancelled = false;

        const fetchBlob = async () => {
            try {
                const resp = await fetch(current.url);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const blob = await resp.blob();
                if (cancelled) return;
                const mimeType = getMimeType(current.url);
                // Ensure correct MIME type (some servers return octet-stream)
                const typedBlob = blob.type.startsWith('video/') ? blob : new Blob([blob], { type: mimeType });
                const objectUrl = URL.createObjectURL(typedBlob);
                videoBlobCache.set(current.url, objectUrl); // Store in cache for reuse
                setBlobUrl(objectUrl);
            } catch (err) {
                console.warn('[Screensaver] blob fetch failed:', err.message);
                if (!cancelled) {
                    timerRef.current = setTimeout(advanceSafe, 2000);
                }
            }
        };

        fetchBlob();
        return () => { cancelled = true; };
    }, [current?.url, advanceSafe]);

    // ── Video ref callback: play as soon as element mounts / src is set ─
    const videoRefCb = useCallback((node) => {
        if (!node) return;
        const tryPlay = () => {
            node.play().catch(err => {
                console.warn('[Screensaver] play() failed:', err.message, 'code:', node.error?.code);
                timerRef.current = setTimeout(advanceSafe, 3000);
            });
        };
        if (node.readyState >= 2) {
            tryPlay();
        } else {
            node.addEventListener('canplay', tryPlay, { once: true });
        }
    }, [advanceSafe]);

    // ── Dismiss via native pointerdown on root ─────────────────────────
    const handleDismiss = useCallback(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;
        clearTimeout(timerRef.current);
        onDismiss?.();
    }, [onDismiss]);

    useEffect(() => {
        const el = document.getElementById('screensaver-root');
        if (!el) return;
        el.addEventListener('pointerdown', handleDismiss);
        return () => el.removeEventListener('pointerdown', handleDismiss);
    }, [handleDismiss]);

    // ── Render ─────────────────────────────────────────────────────────
    return (
        <div
            id="screensaver-root"
            className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none cursor-pointer"
        >
            {/* Media — pointer-events off so taps reach #screensaver-root */}
            <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0, pointerEvents: 'none' }}
            >
                {!loaded ? null : !current ? (
                    // Static fallback
                    <div className="absolute inset-0 bg-gradient-to-b from-[#12100B] to-[#2C1A0F] flex flex-col items-center justify-center">
                        {!logoLoaded && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#12100B]/80 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 border-4 border-[#c28744] border-t-[#2C1A0F] rounded-full animate-spin"></div>
                                    <span className="text-white font-bold tracking-widest uppercase text-sm">Cargando...</span>
                                </div>
                            </div>
                        )}
                        <img src={logo} alt="Logo" className="w-64 object-contain mb-8 opacity-90" onLoad={() => setLogoLoaded(true)} onError={() => setLogoLoaded(true)} />
                        <h1 className="text-5xl font-black text-white tracking-tight">Manuela Desayuna</h1>
                    </div>
                ) : current.isVideo ? (
                    blobUrl ? (
                        <video
                            key={blobUrl}
                            ref={videoRefCb}
                            src={blobUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            playsInline
                            preload="auto"
                            onEnded={advanceSafe}
                            onError={(e) => {
                                const code = e.target?.error?.code;
                                console.warn('[Screensaver] video error code:', code);
                                timerRef.current = setTimeout(advanceSafe, 1000);
                            }}
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        // Loading blob...
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    )
                ) : (
                    <img
                        key={current.url}
                        src={current.url}
                        alt="screensaver"
                        className="w-full h-full object-cover"
                        style={{ display: 'block' }}
                    />
                )}
            </div>

            {/* Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" style={{ pointerEvents: 'none' }} />

            {/* Hint */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-pulse" style={{ pointerEvents: 'none' }}>
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v4" /><path d="M12 2v4" /><path d="M16 2v4" />
                        <rect width="16" height="12" x="4" y="8" rx="2" />
                        <path d="M8 12h.01" />
                    </svg>
                </div>
                <span className="uppercase tracking-[0.2em] text-xs font-bold text-white/80 bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    Toca para continuar
                </span>
            </div>

            {/* Dot indicators */}
            {media.length > 1 && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex gap-2" style={{ pointerEvents: 'none' }}>
                    {media.map((_, i) => (
                        <div key={i} className={`rounded-full transition-all duration-300 ${i === index ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScreenSaver;
