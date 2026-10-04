// /src/utils/categories.js - Version complète
export const STANDARD_CATEGORIES = [
  { value: "Hair Care", label: "Soins Cheveux", icon: "💇" },
  { value: "Skincare", label: "Soins Visage", icon: "🧴" },
  { value: "Makeup", label: "Maquillage", icon: "💄" },
  { value: "Accessories", label: "Accessoires", icon: "💍" },
  { value: "Nail Care", label: "Soins Ongles", icon: "💅" },
  { value: "Body Care", label: "Soins Corps", icon: "🧖" },
];

// Fonction pour obtenir toutes les catégories (standard + personnalisées)
export const getAllCategories = (customCategories = []) => {
  return [
    ...STANDARD_CATEGORIES,
    ...customCategories.map(cat => ({ 
      value: cat, 
      label: cat, 
      icon: "🏷️" 
    }))
  ];
};

export const getCategoryLabel = (value) => {
  if (!value) return "Non défini";
  const category = STANDARD_CATEGORIES.find(c => c.value === value);
  return category ? category.label : value;
};

export const getCategoryIcon = (value) => {
  if (!value) return "📦";
  const category = STANDARD_CATEGORIES.find(c => c.value === value);
  return category ? category.icon : "🏷️";
};

export const isStandardCategory = (value) => {
  return STANDARD_CATEGORIES.some(c => c.value === value);
};

export const isValidCategory = (value) => {
  return STANDARD_CATEGORIES.some(c => c.value === value) || (value && value.trim().length > 0);
};