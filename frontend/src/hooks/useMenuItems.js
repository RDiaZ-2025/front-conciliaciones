import { useState, useEffect } from 'react';
import { menuService } from '../services/menuService';
import { useAuth } from '../contexts/AuthContext';
import {
  History as HistoryIcon,
  Upload as UploadIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

// Icon mapping for menu items
const iconMap = {
  'HistoryIcon': HistoryIcon,
  'UploadIcon': UploadIcon,
  'DashboardIcon': DashboardIcon,
  'PeopleIcon': PeopleIcon,
  'AssignmentIcon': AssignmentIcon
};

// Default fallback menu items
const defaultMenuItems = [
  {
    id: 'historial',
    label: 'Historial Carga Archivos',
    icon: 'HistoryIcon',
    route: '/historial',
    displayOrder: 1
  },
  {
    id: 'upload',
    label: 'Cargar Documentos',
    icon: 'UploadIcon',
    route: '/upload',
    displayOrder: 2
  },
  {
    id: 'dashboard',
    label: 'Dashboard de Gestión',
    icon: 'DashboardIcon',
    route: '/dashboard',
    displayOrder: 3
  },
  {
    id: 'production',
    label: 'Producción',
    icon: 'AssignmentIcon',
    route: '/production',
    displayOrder: 4
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: 'PeopleIcon',
    route: '/admin',
    displayOrder: 5
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
      icon: IconComponent ? IconComponent.name : 'AssignmentIcon', // Store icon name instead of component
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