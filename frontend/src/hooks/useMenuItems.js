import { useState, useEffect } from 'react';
import { menuService } from '../services/menuService';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../constants/auth';
import {
  History as HistoryIcon,
  CloudUpload as CloudUploadIcon,
  Analytics as AnalyticsIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Factory as FactoryIcon
} from '@mui/icons-material';

// Icon mapping for menu items
const iconMap = {
  'HistoryIcon': HistoryIcon,
  'CloudUploadIcon': CloudUploadIcon,
  'AnalyticsIcon': AnalyticsIcon,
  'SupervisorAccountIcon': SupervisorAccountIcon,
  'FactoryIcon': FactoryIcon
};

// Default fallback menu items with permissions
const defaultMenuItems = [
  {
    id: 'historial',
    label: 'Historial Carga Archivos',
    icon: 'HistoryIcon',
    route: '/historial',
    displayOrder: 1,
    permission: PERMISSIONS.HISTORY_LOAD_COMMERCIAL_FILES
  },
  {
    id: 'upload',
    label: 'Cargar Documentos',
    icon: 'CloudUploadIcon',
    route: '/upload',
    displayOrder: 2,
    permission: PERMISSIONS.DOCUMENT_UPLOAD
  },
  {
    id: 'dashboard',
    label: 'Dashboard de Gestión',
    icon: 'AnalyticsIcon',
    route: '/dashboard',
    displayOrder: 3,
    permission: PERMISSIONS.MANAGEMENT_DASHBOARD
  },
  {
    id: 'production',
    label: 'Producción',
    icon: 'FactoryIcon',
    route: '/production',
    displayOrder: 4,
    permission: PERMISSIONS.PRODUCTION_MANAGEMENT
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: 'SupervisorAccountIcon',
    route: '/admin',
    displayOrder: 5,
    permission: PERMISSIONS.ADMIN_PANEL
  }
];

// Transform hierarchical menu items to flat structure for NavigationDrawer
const transformMenuItems = (menuItems, level = 0) => {
  const transformed = [];
  
  menuItems.forEach(item => {
    const IconComponent = iconMap[item.icon];
    
    // Add the current item
    transformed.push({
      id: item.id,
      label: item.label,
      icon: IconComponent ? IconComponent.name : 'FactoryIcon', // Store icon name instead of component
      route: item.route,
      displayOrder: item.displayOrder,
      level: level, // Add level for potential indentation
      hasChildren: item.children && item.children.length > 0
    });
    
    // Recursively add children
    if (item.children && item.children.length > 0) {
      const childItems = transformMenuItems(item.children, level + 1);
      transformed.push(...childItems);
    }
  });
  
  return transformed;
};

export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Since permissions are no longer stored in menu items, fetch all menu items
      console.log('🔍 Fetching hierarchical menu items from database');
      
      const hierarchicalMenuItems = await menuService.getAllMenuItems();
      console.log('📋 Hierarchical database menu items received:', hierarchicalMenuItems);
      
      if (hierarchicalMenuItems && hierarchicalMenuItems.length > 0) {
        // Transform hierarchical structure to flat structure for NavigationDrawer
        const transformedItems = transformMenuItems(hierarchicalMenuItems);
        
        // Sort by displayOrder (should already be sorted from backend, but ensure it)
        transformedItems.sort((a, b) => a.displayOrder - b.displayOrder);
        
        console.log('✨ Transformed flat menu items:', transformedItems);
        setMenuItems(transformedItems);
      } else {
        console.log('⚠️ No menu items from database, using defaults');
        setMenuItems(defaultMenuItems);
      }
    } catch (err) {
      console.error('❌ Error fetching menu items:', err);
      setError(err.message);
      
      // Fallback to default menu items on error
      console.log('🔄 Falling back to default menu items');
      setMenuItems(defaultMenuItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []); // Remove user dependency since we no longer filter by permissions

  const refreshMenuItems = () => {
    fetchMenuItems();
  };

  return {
    menuItems,
    loading,
    error,
    refreshMenuItems
  };
};