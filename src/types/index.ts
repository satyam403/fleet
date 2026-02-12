export interface Trailer {
  id: string;
  number: string;
  make?: string;
  model?: string;
  year?: number;
}

export interface InspectionCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'na' | '';
  comments: string;
}

export interface Inspection {
  id: string;
  trailerId: string;
  trailerNumber: string;
  technicianName: string;
  date: string;
  checklist: InspectionCheckItem[];
  pdfUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  available: number;
  used: number;
  pending: number;
  dateAdded?: string;
  notes?: string;
}

export interface WorkOrderItem {
  itemName: string;
  quantity: number;
}

export interface WorkOrder {
  id: string;
  woNumber: string;
  trailerId: string;
  trailerNumber: string;
  technicianName: string;
  date: string;
  issueNotes: string;
  items: WorkOrderItem[];
  status: 'completed' | 'pending' | 'inProgress';
  pdfUrl?: string;
}

export interface DashboardStats {
  totalTrailers: number;
  inspectionsPending: number;
  usedInventory: number;
  pendingInventory: number;
}
