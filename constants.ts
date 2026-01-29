import { ColumnConfig, Role } from "./types";

// Simulate the "Settings" sheet configuration
export const LEAVE_REQUEST_CONFIG: ColumnConfig[] = [
  { key: 'id', label: 'ID', type: 'text', hidden: true, noSave: false },
  { key: 'studentName', label: 'Họ và tên', type: 'text', required: true },
  { key: 'class', label: 'Lớp', type: 'select', options: ['10A1', '10A2', '11A1', '11A2', '12A1'], required: true },
  { key: 'reason', label: 'Lý do nghỉ', type: 'select', options: ['Ốm đau', 'Việc gia đình', 'Đi khám bệnh', 'Khác'], required: true },
  { key: 'detail', label: 'Chi tiết', type: 'textarea', required: false },
  { key: 'fromDate', label: 'Từ ngày', type: 'date', required: true },
  { key: 'toDate', label: 'Đến ngày', type: 'date', required: true },
  { key: 'attachment', label: 'Minh chứng (Ảnh/File)', type: 'file', required: false },
  { key: 'status', label: 'Trạng thái', type: 'select', options: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'], required: false, noSave: false }, // Usually managed by system, but listed for Admin
];

export const APP_NAME = "EduLeave";

export const PERMISSIONS = {
  [Role.ADMIN]: { canEdit: true, canDelete: true, canApprove: true, canConfig: true },
  [Role.USER]: { canEdit: true, canDelete: false, canApprove: true, canConfig: false },
  [Role.HS]: { canEdit: false, canDelete: false, canApprove: false, canConfig: false }, // Can only create
  [Role.VIEWER]: { canEdit: false, canDelete: false, canApprove: false, canConfig: false },
};