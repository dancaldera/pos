import apiClient from './client';

export interface SystemSettings {
  id?: number;
  businessName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxRate: number;
  currency: string;
  logoUrl?: string | null;
  receiptFooter?: string | null;
  updatedAt?: string;
}

// Get system settings
export const getSettings = async () => {
  const response = await apiClient.get('/settings');
  return response.data;
};

// Update settings
export const updateSettings = async (settingsData: FormData) => {
  // Debug what's in the FormData before sending
  console.log('API: Sending FormData with these entries:');
  for (const pair of settingsData.entries()) {
    console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'File' : pair[1]}`);
  }
  
  const response = await apiClient.put('/settings', settingsData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  console.log('API: Response from server:', response.data);
  return response.data;
};