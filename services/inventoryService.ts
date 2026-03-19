import { supabase } from '../lib/supabase';

export interface InventoryProduct {
  id: string; // UUID
  name: string;
  stock: number;
  min_stock: number;
  IDEmpresa: number;
  created_at?: string;
}

export interface InventoryMovement {
  id?: string; // UUID
  product_id: string; // Foreign key
  empresa_id: number;
  type: 'in' | 'out' | 'delete' | 'adjust';
  quantity: number;
  date: string; // YYYY-MM-DD
  responsible_name: string;
  notes?: string;
  created_at?: string;
}

export const inventoryService = {
  // ... existing methods ...
  async getProducts(empresaId: number): Promise<InventoryProduct[]> {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('*')
      .eq('IDEmpresa', empresaId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    return data || [];
  },

  async getMovements(empresaId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        *,
        inventory_products ( name )
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) {
       console.error('Error fetching movements:', error);
       throw error;
    }

    return data || [];
  },

  async getAllProductNames(empresaId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('name')
      .eq('IDEmpresa', empresaId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all product names:', error);
      return [];
    }

    // Return unique names
    const names = data.map(item => item.name);
    return Array.from(new Set(names));
  },

  async addProducts(products: Omit<InventoryProduct, 'id' | 'created_at'>[]): Promise<InventoryProduct[]> {
    const { data, error } = await supabase
      .from('inventory_products')
      .insert(products)
      .select();

    if (error) {
      console.error('Error adding products:', error);
      throw error;
    }
    
    return data || [];
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
  
  async deleteProduct(id: string, empresaId: number, responsible: string): Promise<void> {
    // 1. Soft delete the product
    const { error: updateError } = await supabase
      .from('inventory_products')
      .update({ is_active: false })
      .eq('id', id)
      .eq('IDEmpresa', empresaId);

    if (updateError) {
       console.error('Error deleting product:', updateError);
       throw updateError;
    }

    // 2. Record the deletion movement
    const { error: movError } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: id,
        empresa_id: empresaId,
        type: 'delete',
        quantity: 0,
        date: new Date().toISOString().split('T')[0],
        responsible_name: responsible,
        notes: 'Produto excluído do sistema'
      });

    if (movError) {
      console.error('Error recording deletion movement:', movError);
      // We don't throw here to not break the UI if movement fails, but ideally it should be a transaction.
    }
  },

  async recordMovement(movement: InventoryMovement): Promise<void> {
    const { error } = await supabase
      .from('inventory_movements')
      .insert(movement);

    if (error) {
       console.error('Error recording movement:', error);
       throw error;
    }
  }
};
