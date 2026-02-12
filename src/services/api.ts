// Mock data storage using localStorage with initial seed data
import type { 
  Trailer, 
  Inspection, 
  InventoryItem, 
  WorkOrder, 
  DashboardStats 
} from '../types';

// Storage keys
const STORAGE_KEYS = {
  trailers: 'fleetops-trailers',
  inspections: 'fleetops-inspections',
  inventory: 'fleetops-inventory',
  workOrders: 'fleetops-workOrders',
  users: 'fleetops-users',
};

// Initialize with seed data if not exists
function initializeStorage() {
  // Initialize demo users
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    const demoUsers = [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@fleetops.com',
        password: 'admin123',
        role: 'admin',
      },
      {
        id: '2',
        name: 'Technician User',
        email: 'tech@fleetops.com',
        password: 'tech123',
        role: 'technician',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(demoUsers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.trailers)) {
    const trailers: Trailer[] = [
      { id: '1', number: 'TRL-001', make: 'Utility', model: '3000R', year: 2020 },
      { id: '2', number: 'TRL-002', make: 'Great Dane', model: 'Everest', year: 2021 },
      { id: '3', number: 'TRL-003', make: 'Wabash', model: 'DuraPlate', year: 2019 },
      { id: '4', number: 'TRL-004', make: 'Utility', model: '4000D-X', year: 2022 },
      { id: '5', number: 'TRL-005', make: 'Great Dane', model: 'Champion', year: 2021 },
    ];
    localStorage.setItem(STORAGE_KEYS.trailers, JSON.stringify(trailers));
  }

  if (!localStorage.getItem(STORAGE_KEYS.inventory)) {
    const inventory: InventoryItem[] = [
      { id: '1', name: 'Brake Pads', available: 50, used: 20, pending: 10, dateAdded: '2026-01-15' },
      { id: '2', name: 'Tires - 11R22.5', available: 30, used: 15, pending: 5, dateAdded: '2026-01-20' },
      { id: '3', name: 'Oil Filter', available: 100, used: 45, pending: 15, dateAdded: '2026-02-01' },
      { id: '4', name: 'Air Filter', available: 80, used: 30, pending: 10, dateAdded: '2026-02-05' },
      { id: '5', name: 'LED Light Kit', available: 25, used: 8, pending: 3, dateAdded: '2026-02-08' },
      { id: '6', name: 'Suspension Bushings', available: 60, used: 22, pending: 8, dateAdded: '2026-01-25' },
    ];
    localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));
  }

  if (!localStorage.getItem(STORAGE_KEYS.inspections)) {
    localStorage.setItem(STORAGE_KEYS.inspections, JSON.stringify([]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.workOrders)) {
    const workOrders: WorkOrder[] = [
      {
        id: '1',
        woNumber: 'WO-2026-001',
        trailerId: '1',
        trailerNumber: 'TRL-001',
        technicianName: 'John Smith',
        date: '2026-02-10',
        issueNotes: 'Brake system maintenance and inspection',
        items: [
          { itemName: 'Brake Pads', quantity: 4 },
          { itemName: 'Oil Filter', quantity: 1 },
        ],
        status: 'completed',
      },
      {
        id: '2',
        woNumber: 'WO-2026-002',
        trailerId: '3',
        trailerNumber: 'TRL-003',
        technicianName: 'Maria Garcia',
        date: '2026-02-11',
        issueNotes: 'Replace damaged tires and check alignment',
        items: [
          { itemName: 'Tires - 11R22.5', quantity: 2 },
        ],
        status: 'completed',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.workOrders, JSON.stringify(workOrders));
  }
}

// Generic storage functions
function getFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Trailers
export async function getTrailers(): Promise<Trailer[]> {
  initializeStorage();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getFromStorage<Trailer>(STORAGE_KEYS.trailers));
    }, 300);
  });
}

// Inspections
export async function getInspections(): Promise<Inspection[]> {
  initializeStorage();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getFromStorage<Inspection>(STORAGE_KEYS.inspections));
    }, 300);
  });
}

export async function createInspection(inspection: Omit<Inspection, 'id'>): Promise<Inspection> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const inspections = getFromStorage<Inspection>(STORAGE_KEYS.inspections);
      const newInspection: Inspection = {
        ...inspection,
        id: Date.now().toString(),
      };
      inspections.unshift(newInspection);
      saveToStorage(STORAGE_KEYS.inspections, inspections);
      resolve(newInspection);
    }, 500);
  });
}

// Inventory
export async function getInventory(): Promise<InventoryItem[]> {
  initializeStorage();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getFromStorage<InventoryItem>(STORAGE_KEYS.inventory));
    }, 300);
  });
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const inventory = getFromStorage<InventoryItem>(STORAGE_KEYS.inventory);
      const newItem: InventoryItem = {
        ...item,
        id: Date.now().toString(),
      };
      inventory.push(newItem);
      saveToStorage(STORAGE_KEYS.inventory, inventory);
      resolve(newItem);
    }, 300);
  });
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const inventory = getFromStorage<InventoryItem>(STORAGE_KEYS.inventory);
      const index = inventory.findIndex(item => item.id === id);
      
      if (index !== -1) {
        inventory[index] = { ...inventory[index], ...updates };
        saveToStorage(STORAGE_KEYS.inventory, inventory);
        resolve(inventory[index]);
      } else {
        resolve(null);
      }
    }, 300);
  });
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const inventory = getFromStorage<InventoryItem>(STORAGE_KEYS.inventory);
      const filtered = inventory.filter(item => item.id !== id);
      saveToStorage(STORAGE_KEYS.inventory, filtered);
      resolve(true);
    }, 300);
  });
}

// Work Orders
export async function getWorkOrders(): Promise<WorkOrder[]> {
  initializeStorage();
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getFromStorage<WorkOrder>(STORAGE_KEYS.workOrders));
    }, 300);
  });
}

export async function createWorkOrder(workOrder: Omit<WorkOrder, 'id' | 'woNumber'>): Promise<WorkOrder> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const workOrders = getFromStorage<WorkOrder>(STORAGE_KEYS.workOrders);
      const woNumber = `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(3, '0')}`;
      
      const newWorkOrder: WorkOrder = {
        ...workOrder,
        id: Date.now().toString(),
        woNumber,
      };

      // Update inventory quantities
      const inventory = getFromStorage<InventoryItem>(STORAGE_KEYS.inventory);
      workOrder.items.forEach(item => {
        const inventoryItem = inventory.find(inv => inv.name === item.itemName);
        if (inventoryItem && inventoryItem.available >= item.quantity) {
          inventoryItem.available -= item.quantity;
          inventoryItem.used += item.quantity;
        }
      });
      saveToStorage(STORAGE_KEYS.inventory, inventory);

      workOrders.unshift(newWorkOrder);
      saveToStorage(STORAGE_KEYS.workOrders, workOrders);
      resolve(newWorkOrder);
    }, 500);
  });
}

// Dashboard Stats
export async function getDashboardStats(): Promise<DashboardStats> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const trailers = getFromStorage<Trailer>(STORAGE_KEYS.trailers);
      const inspections = getFromStorage<Inspection>(STORAGE_KEYS.inspections);
      const inventory = getFromStorage<InventoryItem>(STORAGE_KEYS.inventory);

      // Count pending inspections (trailers that haven't been inspected in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentInspections = inspections.filter(
        insp => new Date(insp.date) >= thirtyDaysAgo
      );
      const inspectedTrailerIds = new Set(recentInspections.map(insp => insp.trailerId));
      const inspectionsPending = trailers.length - inspectedTrailerIds.size;

      const usedInventory = inventory.reduce((sum, item) => sum + item.used, 0);
      const pendingInventory = inventory.reduce((sum, item) => sum + item.pending, 0);

      resolve({
        totalTrailers: trailers.length,
        inspectionsPending,
        usedInventory,
        pendingInventory,
      });
    }, 300);
  });
}