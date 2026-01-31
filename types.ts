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
  type: 'text' | 'number' | 'date' | 'email' | 'select' | 'multiselect' | 'file' | 'textarea' | 'password';
  required?: boolean;
  options?: string[]; // For static dropdowns
  refSheet?: string; // For reference dropdowns
  hidden?: boolean;
  noSave?: boolean;
  width?: string;
  defaultValue?: any;
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
  email?: string;
  role: Role;
  class?: string; // For Students
  password?: string; // Optional for UI, handled in backend
}

export interface LeaveRequest {
  id: string;
  studentName: string;
  class: string;
  week: number; // Added week field
  reason: string;
  fromDate: string;
  toDate: string;
  status: Status;
  createdBy: string;
  createdAt: string;
  approver?: string; 
  attachmentUrl?: string;
  [key: string]: any; // Allow dynamic fields based on config
}

export interface SystemConfigData {
  classes: string[];
  reasons: string[];
  schoolName: string;
  currentWeek: number; // Added currentWeek setting
  [key: string]: any;
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
