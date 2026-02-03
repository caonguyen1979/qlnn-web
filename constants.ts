
import { ColumnConfig, Role } from "./types";

export const LEAVE_REQUEST_CONFIG: ColumnConfig[] = [
  { key: 'id', label: 'ID', type: 'text', hidden: true, noSave: false },
  { key: 'week', label: 'Tuần học', type: 'number', required: true, width: 'w-1/4' },
  { key: 'studentName', label: 'Họ và tên học sinh', type: 'text', required: true },
  { key: 'class', label: 'Lớp', type: 'select', options: [], required: true },
  { key: 'reason', label: 'Lý do nghỉ', type: 'select', options: [], required: true },
  { key: 'detail', label: 'Chi tiết', type: 'textarea', required: false },
  { key: 'fromDate', label: 'Từ ngày', type: 'date', required: true },
  { key: 'toDate', label: 'Đến ngày', type: 'date', required: true },
  { key: 'attachmentUrl', label: 'Minh chứng (Ảnh/File)', type: 'file', required: false },
  { key: 'status', label: 'Trạng thái', type: 'select', options: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'], required: false, noSave: false },
];

export const APP_NAME = "Hệ thống Quản lý Nghỉ phép";

export const PERMISSIONS = {
  [Role.ADMIN]: { canEdit: true, canDelete: true, canApprove: true, canConfig: true },
  [Role.USER]: { canEdit: true, canDelete: false, canApprove: true, canConfig: false },
  [Role.GVCN]: { canEdit: true, canDelete: false, canApprove: false, canConfig: false },
  [Role.HS]: { canEdit: false, canDelete: false, canApprove: false, canConfig: false },
  [Role.VIEWER]: { canEdit: false, canDelete: false, canApprove: false, canConfig: false },
};
