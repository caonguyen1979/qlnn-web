// Enums for Roles and Status
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER', // Staff/Manager
  HS = 'HS',     // Student/Teacher requester
  VIEWER = 'VIEWER'
}

export enum Status {
  PENDING = 'Chờ duyệt',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Từ chối'
}

// Configuration Types
export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'select' | 'multiselect' | 'file' | 'textarea';
  required?: boolean;
  options?: string[]; // For static dropdowns
  refSheet?: string; // For reference dropdowns
  hidden?: boolean;
  noSave?: boolean;
  width?: string;
}

export interface SheetConfig {
  sheetName: string;
  columns: ColumnConfig[];
}

// Data Types
export interface User {
  id: string;
  username: string;
  fullname: string;
  role: Role;
  class?: string; // For Students
}

export interface LeaveRequest {
  id: string;
  studentName: string;
  class: string;
  reason: string;
  fromDate: string;
  toDate: string;
  status: Status;
  createdBy: string;
  createdAt: string;
  attachmentUrl?: string;
  [key: string]: any; // Allow dynamic fields based on config
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}