import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { useLanguage } from '../context/LanguageContext';
import { X } from 'lucide-react';

const LANGS = [
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
    { code: 'pt', flag: '🇵🇹', label: 'PT' },
];

const AdminProductForm = ({ productToEdit, onCancel, onSuccess }) => {
    const { addProduct, updateProduct, uploadImage, categories, allergens } = useProducts();
    const { t } = useLanguage();

    const [newModifier, setNewModifier] = useState({ name: '', price: '' });
    const [activeLang, setActiveLang] = useState('es');

    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        name_pt: '',
        price: '',
        categoryId: 'toasts',
        image: '',
        desc: '',
        desc_en: '',
        desc_pt: '',
        kcal: '',
        allergens: [],
        modifiers: []
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name || '',
                name_en: productToEdit.name_en || '',
                name_pt: productToEdit.name_pt || '',
                price: productToEdit.price ?? '',
                categoryId: productToEdit.categoryId || 'toasts',
                image: productToEdit.image || '',
                desc: productToEdit.desc || '',
                desc_en: productToEdit.desc_en || '',
                desc_pt: productToEdit.desc_pt || '',
                kcal: productToEdit.kcal ?? '',
                allergens: productToEdit.allergens || [],
                modifiers: productToEdit.modifiers || []
            });
            setImagePreview(productToEdit.image);
        }
    }, [productToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAllergenToggle = (allergenKey) => {
        setFormData(prev => {
            const current = prev.allergens;
            if (current.includes(allergenKey)) {
                return { ...prev, allergens: current.filter(a => a !== allergenKey) };
            } else {
                return { ...prev, allergens: [...current, allergenKey] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        let imageUrl = formData.image;

        if (imageFile) {
            const uploadResult = await uploadImage(imageFile);
            if (!uploadResult.success) {
                setError('Error subiendo imagen: ' + uploadResult.error);
                setLoading(false);
                return;
            }
            imageUrl = uploadResult.url;
        }

        const productData = {
            ...formData,
            image: imageUrl,
            price: parseFloat(formData.price),
            kcal: parseInt(formData.kcal, 10),
        };

        let result;
        if (productToEdit) {
            result = await updateProduct(productToEdit.id, productData);
        } else {
            result = await addProduct(productData);
        }

        setLoading(false);
        if (result.success) {
            onSuccess();
        } else {
            setError(result.error);
        }
    };

    // Which name/desc fields to show for current tab
    const nameField = activeLang === 'es' ? 'name' : `name_${activeLang}`;
    const descField = activeLang === 'es' ? 'desc' : `desc_${activeLang}`;
    const isRequired = activeLang === 'es';

    return (
        <div className="bg-[#FFF8E7] p-6 rounded-xl shadow-lg border border-[#c28744]/20">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                    {productToEdit ? t('edit_product') || 'Editar Producto' : t('add_product') || 'Añadir Nuevo Producto'}
                </h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Language Tabs */}
                <div className="flex gap-1 bg-[#2C1A0F]/10 p-1 rounded-xl w-fit border border-[#c28744]/20">
                    {LANGS.map(l => (
                        <button
                            key={l.code}
                            type="button"
                            onClick={() => setActiveLang(l.code)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${activeLang === l.code
                                ? 'bg-[#c28744] text-[#12100B] shadow'
                                : 'text-[#5A4033] hover:bg-[#c28744]/10'}`}
                        >
                            {l.flag} {l.label}
                            {l.code === 'es' && <span className="text-[10px] opacity-60 ml-0.5">*</span>}
                        </button>
                    ))}
                </div>

                {/* Name + Price */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#5A4033] mb-1">
                            {t('product_name') || 'Nombre'}
                            {activeLang !== 'es' && <span className="ml-1 text-xs text-[#c28744]">({LANGS.find(l => l.code === activeLang)?.flag})</span>}
                        </label>
                        <input
                            type="text"
                            name={nameField}
                            value={formData[nameField] || ''}
                            onChange={handleChange}
                            required={isRequired}
                            placeholder={activeLang !== 'es' ? `Nombre en ${LANGS.find(l => l.code === activeLang)?.label} (opcional)` : ''}
                            className="w-full p-2 border border-[#c28744]/30 rounded-lg focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#5A4033] mb-1">{t('price') || 'Precio (€)'}</label>
                        <input
                            type="number"
                            name="price"
                            step="0.01"
                            value={formData.price ?? ''}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border border-[#c28744]/30 rounded-lg focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                        />
                    </div>
                </div>

                {/* Category + Kcal (only show on ES tab since they're language-neutral) */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[#5A4033] mb-1">{t('category') || 'Categoría'}</label>
                        <select
                            name="categoryId"
                            value={formData.categoryId || ''}
                            onChange={handleChange}
                            className="w-full p-2 border border-[#c28744]/30 rounded-lg focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                        >
                            {categoryOptions.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#5A4033] mb-1">Kcal</label>
                        <input
                            type="number"
                            name="kcal"
                            value={formData.kcal ?? ''}
                            onChange={handleChange}
                            className="w-full p-2 border border-[#c28744]/30 rounded-lg focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                        />
                    </div>
                </div>

                {/* Image (language-neutral) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('product_image') || 'Imagen del Producto'}</label>
                    <div className="flex items-center gap-4">
                        {imagePreview && (
                            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-amber-50 file:text-amber-700
                                hover:file:bg-amber-100
                            "
                        />
                    </div>
                    {!imageFile && formData.image && <p className="text-xs text-gray-400 mt-1">Imagen actual: {formData.image}</p>}
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-[#5A4033] mb-1">
                        {t('description') || 'Descripción'}
                        {activeLang !== 'es' && <span className="ml-1 text-xs text-[#c28744]">({LANGS.find(l => l.code === activeLang)?.flag} opcional)</span>}
                    </label>
                    <textarea
                        name={descField}
                        value={formData[descField]}
                        onChange={handleChange}
                        rows="3"
                        placeholder={activeLang !== 'es' ? `Descripción en ${LANGS.find(l => l.code === activeLang)?.label} (opcional)` : ''}
                        className="w-full p-2 border border-[#c28744]/30 rounded-lg focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                    ></textarea>
                </div>

                {/* Modifiers (language-neutral) */}
                <div>
                    <label className="block text-sm font-medium text-[#5A4033] mb-2">{t('modifiers') || 'Extras / Modificadores'}</label>
                    <div className="space-y-2 mb-3">
                        {formData.modifiers.map((mod, index) => (
                            <div key={index} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-[#c28744]/20 shadow-sm">
                                <span className="flex-1 font-medium text-[#2C1A0F]">{mod.name}</span>
                                <span className="font-mono text-[#c28744]">+{parseFloat(mod.price).toFixed(2)}€</span>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        modifiers: prev.modifiers.filter((_, i) => i !== index)
                                    }))}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        {formData.modifiers.length === 0 && (
                            <p className="text-sm text-gray-400 italic">No hay extras configurados.</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Nombre (ej. Extra Queso)"
                            className="flex-1 p-2 border border-[#c28744]/30 rounded-lg text-sm focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                            value={newModifier.name}
                            onChange={e => setNewModifier(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                            type="number"
                            placeholder="Precio"
                            step="0.01"
                            className="w-24 p-2 border border-[#c28744]/30 rounded-lg text-sm focus:ring-2 focus:ring-[#c28744] outline-none bg-white"
                            value={newModifier.price}
                            onChange={e => setNewModifier(prev => ({ ...prev, price: e.target.value }))}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (newModifier.name) {
                                    setFormData(prev => ({
                                        ...prev,
                                        modifiers: [...prev.modifiers, {
                                            id: Date.now(),
                                            name: newModifier.name,
                                            price: parseFloat(newModifier.price || 0)
                                        }]
                                    }));
                                    setNewModifier({ name: '', price: '' });
                                }
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Allergens (language-neutral) */}
                <div>
                    <label className="block text-sm font-medium text-[#5A4033] mb-2">{t('allergens') || 'Alérgenos'}</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(allergens).map(key => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleAllergenToggle(key)}
                                className={`px-3 py-1 rounded-full text-sm border flex items-center gap-2 transition-colors ${formData.allergens.includes(key)
                                    ? 'bg-[#c28744]/20 border-[#c28744] text-[#2C1A0F]'
                                    : 'bg-white border-[#c28744]/20 text-[#5A4033] hover:bg-[#c28744]/10'
                                    }`}
                            >
                                {allergens[key].icon}
                                {allergens[key].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                        {t('cancel') || 'Cancelar'}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-[#2C1A0F] hover:bg-[#3E2515] text-[#c28744] rounded-lg font-bold shadow-md disabled:opacity-50 border border-[#c28744]/20"
                    >
                        {loading ? (t('saving') || 'Guardando...') : (productToEdit ? (t('update') || 'Actualizar') : (t('create_product') || 'Crear Producto'))}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminProductForm;
