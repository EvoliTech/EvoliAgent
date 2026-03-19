import { supabase } from '../lib/supabase';

export interface InventoryProduct {
  id: string; // UUID
  name: string;
  stock: number;
  min_stock: number;
  IDEmpresa: number;
  created_at?: string;
}

export const inventoryService = {
  async getProducts(empresaId: number): Promise<InventoryProduct[]> {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('IDEmpresa', empresaId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return data || [];
  },

  async addProducts(products: Omit<InventoryProduct, 'id' | 'created_at'>[]): Promise<void> {
    const { error } = await supabase
      .from('inventory_products')
      .insert(products);

    if (error) {
      console.error('Error adding products:', error);
      throw error;
    }
  },

  async updateProduct(id: string, empresaId: number, updates: Partial<InventoryProduct>): Promise<void> {
    const { error } = await supabase
      .from('inventory_products')
      .update(updates)
      .eq('id', id)
      .eq('IDEmpresa', empresaId);

    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },
  
  async deleteProduct(id: string, empresaId: number): Promise<void> {
    const { error } = await supabase
      .from('inventory_products')
      .delete()
      .eq('id', id)
      .eq('IDEmpresa', empresaId);

    if (error) {
       console.error('Error deleting product:', error);
       throw error;
    }
  }
};
