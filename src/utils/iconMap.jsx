import React from 'react';
import {
    Wheat, Milk, Egg, Nut, Fish,
    Bean, Apple, Carrot, Ham, Drumstick,
    AlertCircle, Info, Leaf, Flame, Shell
} from 'lucide-react';

export const ICON_MAP = {
    'Wheat': <Wheat size={18} />,
    'Milk': <Milk size={18} />,
    'Egg': <Egg size={18} />,
    'Nut': <Nut size={18} />,
    'Fish': <Fish size={18} />,
    'Shellfish': <Shell size={18} />,
    'Soybean': <Bean size={18} />,
    'Apple': <Apple size={18} />,
    'Carrot': <Carrot size={18} />,
    'Beef': <Ham size={18} />,
    'Chicken': <Drumstick size={18} />,
    'Leaf': <Leaf size={18} />,
    'Flame': <Flame size={18} />,
    'Info': <Info size={18} />,
    'Alert': <AlertCircle size={18} />,
};

export const getIcon = (name) => {
    return ICON_MAP[name] || <AlertCircle size={18} />;
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);
