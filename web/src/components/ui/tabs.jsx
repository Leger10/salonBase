import React, { createContext, useContext, useState, useEffect } from "react";

const TabsContext = createContext();

export const Tabs = ({ 
  defaultValue, 
  value,           // ✅ Ajout du support value contrôlé
  onValueChange,   // ✅ Ajout du callback
  className, 
  children, 
  ...props 
}) => {
  // ✅ Gestion de l'état interne ou contrôlé
  const [internalActiveTab, setInternalActiveTab] = useState(defaultValue || value);
  
  // ✅ Synchronisation avec la prop value (mode contrôlé)
  useEffect(() => {
    if (value !== undefined) {
      setInternalActiveTab(value);
    }
  }, [value]);

  const setActiveTab = (newValue) => {
    setInternalActiveTab(newValue);
    // ✅ Appeler le callback si fourni
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  // ✅ Déterminer la valeur active
  const activeTab = value !== undefined ? value : internalActiveTab;

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className || ''} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ className, children, ...props }) => (
  <div 
    className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className || ''}`} 
    {...props}
  >
    {children}
  </div>
);

export const TabsTrigger = ({ value, className, children, ...props }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-background text-foreground shadow-sm' : ''
      } ${className || ''}`}
      onClick={() => setActiveTab(value)}
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, className, children, ...props }) => {
  const { activeTab } = useContext(TabsContext);
  
  if (activeTab !== value) return null;
  
  return (
    <div 
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`} 
      data-state={activeTab === value ? 'active' : 'inactive'}
      {...props}
    >
      {children}
    </div>
  );
};

// ✅ Export des composants pour une meilleure compatibilité
export default Tabs;