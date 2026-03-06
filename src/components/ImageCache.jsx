import React, { useEffect, useState } from 'react';
import { useProducts } from '../context/ProductContext';
import saver from '../assets/saver.png';

/**
 * ImageCache
 * 
 * Este componente invisible se encarga de precargar (descargar previamente) todas las 
 * imágenes de la aplicación (productos, categorías y recursos estáticos) en la memoria
 * del navegador de Electron de forma **secuencial** en un contenedor del DOM oculto.
 * 
 * Al renderizarlas secuencialmente en el DOM (1 por 1), nos aseguramos de que Chromium no sature
 * la CPU al iniciar, pero mantenga las imágenes persistentemente decodificadas en RAM para 
 * que no vuelvan a cargar al hacer transiciones de página (navegación).
 */
const ImageCache = () => {
    const { products, categories, loading, setAssetsCached } = useProducts();
    const [urlsToCache, setUrlsToCache] = useState([]);
    const [loadedCount, setLoadedCount] = useState(0);

    useEffect(() => {
        if (!loading) {
            const urls = new Set();
            urls.add(saver);

            if (products && products.length > 0) {
                products.forEach(p => {
                    if (p.image) urls.add(p.image);
                });
            }

            if (categories && categories.length > 0) {
                categories.forEach(c => {
                    if (c.image) urls.add(c.image);
                });
            }

            setUrlsToCache(Array.from(urls));
        }
    }, [products, categories, loading]);

    const handleLoadNext = () => {
        if (loadedCount + 1 >= urlsToCache.length) {
            setAssetsCached(true);
        }

        // Pequeña pausa para ceder el control al Main Thread y evitar tirones en la interfaz
        setTimeout(() => {
            setLoadedCount(prev => prev + 1);
        }, 20);
    };

    useEffect(() => {
        if (!loading && urlsToCache.length === 0) {
            setAssetsCached(true);
        }
    }, [loading, urlsToCache, setAssetsCached]);

    if (urlsToCache.length === 0) {
        return null;
    }

    // Solo renderizamos las imágenes desde 0 hasta loadedCount (inclusive)
    // Esto significa que en cada paso, solo intentamos decodificar UNA imagen nueva
    // mientras mantenemos las anteriores de forma segura en el DOM oculto.
    const imagesToRender = urlsToCache.slice(0, loadedCount + 1);

    return (
        <div style={{ display: 'none', width: 0, height: 0, overflow: 'hidden', position: 'absolute' }}>
            {imagesToRender.map((url, index) => {
                const isLast = index === loadedCount;
                return (
                    <img
                        key={url}
                        src={url}
                        alt="cache"
                        fetchPriority={isLast ? "high" : "auto"}
                        onLoad={isLast ? handleLoadNext : undefined}
                        onError={isLast ? handleLoadNext : undefined}
                    />
                );
            })}
        </div>
    );
};

export default ImageCache;
