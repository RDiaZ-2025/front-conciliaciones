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

// Default fallback menu items (empty array as we want to enforce dynamic loading)
const defaultMenuItems = [];

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
      const hierarchicalMenuItems = await menuService.getAllMenuItems();
      
      if (hierarchicalMenuItems && hierarchicalMenuItems.length > 0) {
        // Transform hierarchical structure to flat structure for NavigationDrawer
        const transformedItems = transformMenuItems(hierarchicalMenuItems);
        
        // Sort by displayOrder (should already be sorted from backend, but ensure it)
        transformedItems.sort((a, b) => a.displayOrder - b.displayOrder);
        
        setMenuItems(transformedItems);
      } else {
        setMenuItems(defaultMenuItems);
      }
    } catch (err) {
      setError(err.message);
      
      // Fallback to default menu items on error
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