import { Wheat, Milk, Egg } from 'lucide-react';
import React from 'react';

export const ALLERGENS = {
  gluten: { label: 'Gluten', icon: <Wheat size={18} /> },
  lactose: { label: 'Lactosa', icon: <Milk size={18} /> },
  egg: { label: 'Huevo', icon: <Egg size={18} /> },
};

export const CATEGORIES = [
  { id: 'toasts', name: 'Tostadas', icon: '🥖' },
  { id: 'coffee', name: 'Cafés', icon: '☕' },
  { id: 'pastry', name: 'Bollería', icon: '🥐' },
  { id: 'juice', name: 'Zumos', icon: '🍊' },
  { id: 'bowls', name: 'Bowls', icon: '🥣' },
];

export const COMMON_MODIFIERS = [
  { id: 'extra_jamon', name: 'Extra Jamón', price: 1.50, type: 'add' },
  { id: 'extra_queso', name: 'Extra Queso', price: 0.50, type: 'add' },
  { id: 'extra_aguacate', name: 'Extra Aguacate', price: 1.20, type: 'add' },
  { id: 'sin_tomate', name: 'Sin Tomate', price: 0, type: 'remove' },
  { id: 'sin_aceite', name: 'Sin Aceite', price: 0, type: 'remove' },
  { id: 'pan_integral', name: 'Pan Integral', price: 0.00, type: 'switch' },
];

export const COFFEE_MODIFIERS = [
  { id: 'leche_soja', name: 'Leche de Soja', price: 0.20, type: 'switch' },
  { id: 'leche_avena', name: 'Leche de Avena', price: 0.20, type: 'switch' },
  { id: 'descafeinado', name: 'Descafeinado', price: 0, type: 'switch' },
  { id: 'extra_cafe', name: 'Doble Carga', price: 0.60, type: 'add' },
  { id: 'sacarina', name: 'Sacarina', price: 0, type: 'add' },
  { id: 'hielo', name: 'Con Hielo', price: 0.10, type: 'add' },
];

export const PRODUCTS = [
  {
    id: 1,
    categoryId: 'toasts',
    name: 'Tostada con Tomate',
    price: 2.50,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=500&q=60',
    desc: 'Pan de masa madre tostado, tomate rallado fresco y Aceite de Oliva Virgen Extra.',
    kcal: 280,
    allergens: ['gluten'],
    modifiers: COMMON_MODIFIERS
  },
  {
    id: 2,
    categoryId: 'toasts',
    name: 'Ibérica con Jamón',
    price: 4.90,
    image: 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?auto=format&fit=crop&w=500&q=60',
    desc: 'Nuestro clásico: Jamón de bellota cortado a mano sobre base de tomate natural.',
    kcal: 350,
    allergens: ['gluten'],
    modifiers: COMMON_MODIFIERS
  },
  {
    id: 3,
    categoryId: 'toasts',
    name: 'Aguacate & Huevo',
    price: 5.50,
    image: 'https://images.unsplash.com/photo-1525351484163-7529414395d8?auto=format&fit=crop&w=500&q=60',
    desc: 'Aguacate laminado en su punto, huevo poché, semillas de chía y un toque de pimentón.',
    kcal: 420,
    allergens: ['gluten', 'egg'],
    modifiers: COMMON_MODIFIERS
  },
  {
    id: 4,
    categoryId: 'coffee',
    name: 'Café con Leche',
    price: 1.80,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60',
    desc: 'Espresso 100% arábica de tueste natural con leche cremada.',
    kcal: 110,
    allergens: ['lactose'],
    modifiers: COFFEE_MODIFIERS
  },
  {
    id: 5,
    categoryId: 'coffee',
    name: 'Cappuccino',
    price: 2.20,
    image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60',
    desc: 'Equilibrio perfecto entre espresso, leche vaporizada y espuma de leche, con cacao espolvoreado.',
    kcal: 140,
    allergens: ['lactose'],
    modifiers: COFFEE_MODIFIERS
  },
  {
    id: 6,
    categoryId: 'pastry',
    name: 'Croissant Mantequilla',
    price: 1.90,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f40388085?auto=format&fit=crop&w=500&q=60',
    desc: 'Horneado cada mañana. Hojaldrado, crujiente por fuera y tierno por dentro.',
    kcal: 380,
    allergens: ['gluten', 'lactose', 'egg'],
    modifiers: []
  },
  {
    id: 7,
    categoryId: 'juice',
    name: 'Zumo Naranja',
    price: 3.00,
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=500&q=60',
    desc: 'Naranjas de la huerta recién exprimidas. 300ml de pura vitamina C.',
    kcal: 120,
    allergens: [],
    modifiers: []
  },
  {
    id: 8,
    categoryId: 'bowls',
    name: 'Açai Bowl',
    price: 6.50,
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=500&q=60',
    desc: 'Base congelada de pulpa de açai, granola casera crujiente, plátano fresco y coco rallado.',
    kcal: 450,
    allergens: ['gluten'],
    modifiers: [{ id: 'extra_granola', name: 'Extra Granola', price: 0.50, type: 'add' }]
  },
];
