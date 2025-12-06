import { useState, useEffect, useCallback } from 'react';
import { MenuItem, MenuFormData, MenuManagementState } from './types';
import { apiRequest } from '../../services/baseApiService';

export const useMenuManagement = () => {
  const [state, setState] = useState<MenuManagementState>({
    menuItems: [],
    loading: false,
    error: null,
    isDialogOpen: false,
    editingItem: null,
    formData: {
      label: '',
      icon: '',
      route: '',
      parentId: null,
      displayOrder: 0,
      isActive: true
    }
  });

  const fetchMenuItems = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiRequest('/menus');
      setState(prev => ({ ...prev, menuItems: data.data, loading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setState(prev => ({
        ...prev,
        isDialogOpen: true,
        editingItem: item,
        formData: {
          label: item.label,
          icon: item.icon || '',
          route: item.route || '',
          parentId: item.parentId || null,
          displayOrder: item.displayOrder,
          isActive: item.isActive
        }
      }));
    } else {
      setState(prev => ({
        ...prev,
        isDialogOpen: true,
        editingItem: null,
        formData: {
          label: '',
          icon: '',
          route: '',
          parentId: null,
          displayOrder: 0,
          isActive: true
        }
      }));
    }
  };

  const handleCloseDialog = () => {
    setState(prev => ({ ...prev, isDialogOpen: false, editingItem: null }));
  };

  const handleFormChange = (field: keyof MenuFormData, value: any) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [field]: value }
    }));
  };

  const handleSubmit = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const url = state.editingItem ? `/menus/${state.editingItem.id}` : '/menus';
      const method = state.editingItem ? 'PUT' : 'POST';

      await apiRequest(url, {
        method,
        body: JSON.stringify(state.formData)
      });

      await fetchMenuItems();
      handleCloseDialog();
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await apiRequest(`/menus/${id}`, {
        method: 'DELETE'
      });

      await fetchMenuItems();
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };

  return {
    state,
    fetchMenuItems,
    handleOpenDialog,
    handleCloseDialog,
    handleFormChange,
    handleSubmit,
    handleDelete
  };
};
