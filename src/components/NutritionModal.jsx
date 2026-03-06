import React from 'react';
import { Info, X } from 'lucide-react';
import { useProducts } from '../context/ProductContext';

const NutritionModal = ({ onClose }) => {
    const { products, allergens } = useProducts();

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-[#FFF8E7] rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in-up border border-[#c28744]/20">
                <div className="p-6 border-b border-[#c28744]/20 flex justify-between items-center bg-[#FFF8E7]">
                    <h2 className="text-2xl font-serif font-bold flex items-center gap-3 text-[#2C1A0F]">
                        <Info className="text-[#c28744]" />
                        Información Nutricional y Alérgenos
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#c28744]/10 text-[#5A4033] uppercase text-sm tracking-wider">
                                <th className="p-4 rounded-tl-lg">Producto</th>
                                <th className="p-4">Kcal</th>
                                <th className="p-4">Alérgenos</th>
                                <th className="p-4 rounded-tr-lg">Descripción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.map(product => (
                                <tr key={product.id} className="hover:bg-[#c28744]/5 transition-colors border-b border-[#c28744]/10">
                                    <td className="p-4 font-serif font-bold text-[#2C1A0F]">{product.name}</td>
                                    <td className="p-4 text-[#5A4033]">{product.kcal}</td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {product.allergens.length > 0 ? product.allergens.map(a => (
                                                <span key={a} title={allergens[a].label} className="p-1.5 bg-white rounded-md text-[#2C1A0F] border border-[#c28744]/20 shadow-sm">
                                                    {allergens[a].icon}
                                                </span>
                                            )) : <span className="text-gray-400 text-sm">Libre</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-[#5A4033]">{product.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-8 p-4 bg-[#c28744]/5 text-[#5A4033] rounded-xl text-sm border border-[#c28744]/20">
                        <p className="font-bold mb-1 text-[#c28744]">Nota Legal:</p>
                        <p>La información sobre alérgenos se basa en los datos proporcionados por nuestros proveedores. A pesar de nuestras precauciones, no podemos garantizar la ausencia total de trazas (contaminación cruzada).</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NutritionModal;
