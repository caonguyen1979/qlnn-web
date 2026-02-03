
// Enums for Roles and Status
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER', // Ban giám hiệu / Quản lý
  GVCN = 'GVCN', // Giáo viên chủ nhiệm
  HS = 'HS',     // Học sinh / Phụ huynh
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
  min?: string | number;
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
  class?: string; // For Students or GVCN
  password?: string;
}

export interface LeaveRequest {
  id: string;
  studentName: string;
  class: string;
  week: number;
  reason: string;
  fromDate: string;
  toDate: string;
  status: Status;
  createdBy: string;
  createdAt: string;
  approver?: string; 
  attachmentUrl?: string;
  [key: string]: any;
}

export interface SystemConfigData {
  classes: string[];
  reasons: string[];
  schoolName: string;
  currentWeek: number;
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
