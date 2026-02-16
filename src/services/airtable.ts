// src/services/airtable.ts
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME || 'Work_Orders';

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

interface AirtableWorkOrder {
  work_order_number?: string;
  asset_id?: string;
  vendor?: string;
  issue_description?: string;
  status?: string;
  priority?: string;
  repair_date?: string;
  grand_total?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  start_time?: string;
  end_time?: string;
}

// Create Work Order in Airtable
export async function createAirtableWorkOrder(data: AirtableWorkOrder, imageFiles: File[]) {
  try {
    const response = await fetch(AIRTABLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          work_order_number: data.work_order_number,
          asset_id: data.asset_id,
          vendor: data.vendor || '',
          issue_description: data.issue_description,
          status: data.status || 'pending',
          priority: data.priority || 'medium',
          repair_date: data.repair_date,
          grand_total: data.grand_total || 0,
          notes: data.notes || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          start_time: data.start_time || '',
          end_time: data.end_time || '',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Airtable create error:', error);
      throw new Error(`Failed to create work order in Airtable: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Work order created in Airtable:', result);
    return result;
  } catch (error) {
    console.error('💥 Airtable API error:', error);
    throw error;
  }
}

// Update Work Order in Airtable
export async function updateAirtableWorkOrder(recordId: string, data: Partial<AirtableWorkOrder>) {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          ...data,
          updated_at: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Airtable update error:', error);
      throw new Error(`Failed to update work order in Airtable: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Work order updated in Airtable:', result);
    return result;
  } catch (error) {
    console.error('💥 Airtable update error:', error);
    throw error;
  }
}

// Get Work Orders from Airtable
export async function getAirtableWorkOrders() {
  try {
    const response = await fetch(AIRTABLE_API_URL, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Airtable fetch error:', error);
      throw new Error(`Failed to fetch work orders from Airtable: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Work orders fetched from Airtable:', result);
    return result.records;
  } catch (error) {
    console.error('💥 Airtable fetch error:', error);
    throw error;
  }
}

// Delete Work Order from Airtable
export async function deleteAirtableWorkOrder(recordId: string) {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/${recordId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Airtable delete error:', error);
      throw new Error(`Failed to delete work order from Airtable: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Work order deleted from Airtable:', result);
    return result;
  } catch (error) {
    console.error('💥 Airtable delete error:', error);
    throw error;
  }
}