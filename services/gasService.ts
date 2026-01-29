import { User, Role, LeaveRequest, Status, ApiResponse, DashboardStats } from '../types';

// --- MOCK DATABASE (For Local Development) ---
const MOCK_USERS: User[] = [
  { id: 'u1', username: 'admin', fullname: 'Nguyễn Văn Admin', role: Role.ADMIN },
  { id: 'u2', username: 'teacher', fullname: 'Cô giáo Thảo', role: Role.USER },
  { id: 'u3', username: 'student', fullname: 'Em Học Sinh', role: Role.HS, class: '10A1' },
];

let MOCK_DATA: LeaveRequest[] = [
  { id: 'REQ-001', studentName: 'Em Học Sinh', class: '10A1', reason: 'Ốm đau', fromDate: '2023-10-20', toDate: '2023-10-21', status: Status.APPROVED, createdBy: 'student', createdAt: new Date().toISOString() },
  { id: 'REQ-002', studentName: 'Trần Văn B', class: '11A2', reason: 'Việc gia đình', fromDate: '2023-10-22', toDate: '2023-10-22', status: Status.PENDING, createdBy: 'studentB', createdAt: new Date().toISOString() },
];

// --- HELPER: DETECT ENVIRONMENT ---
// Check if we are running inside Google Apps Script iFrame
const isGAS = typeof window !== 'undefined' && (window as any).google && (window as any).google.script;

// Helper to promisify google.script.run
const serverCall = (funcName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!isGAS) {
      console.error(`Cannot call ${funcName} outside of GAS environment`);
      reject("Not in GAS");
      return;
    }
    (window as any).google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [funcName](...args);
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAIN SERVICE ---

export const gasService = {
  // 1. System Config & Initialization
  loadAllConfigData: async (): Promise<{ users: User[], requests: LeaveRequest[] }> => {
    if (isGAS) {
      return await serverCall('api_loadAllConfigData');
    }
    
    // Fallback: Mock Data
    await delay(800);
    return { users: MOCK_USERS, requests: [...MOCK_DATA] };
  },

  // 2. Auth
  login: async (username: string): Promise<ApiResponse<User>> => {
    if (isGAS) {
      return await serverCall('api_login', username);
    }

    await delay(500);
    const user = MOCK_USERS.find(u => u.username === username);
    return user ? { success: true, data: user } : { success: false, message: 'Sai tên đăng nhập' };
  },

  // 3. CRUD Operations
  createRequest: async (data: Partial<LeaveRequest>, user: User): Promise<ApiResponse<LeaveRequest>> => {
    if (isGAS) {
      // We pass user info to backend to verify creator
      return await serverCall('api_createRequest', data, JSON.stringify(user));
    }

    await delay(600);
    const newId = `REQ-${Date.now()}`;
    const newRequest: LeaveRequest = {
      id: newId,
      studentName: user.role === Role.HS ? user.fullname : (data.studentName || 'Unknown'),
      class: user.role === Role.HS ? (user.class || 'N/A') : (data.class || 'N/A'),
      reason: data.reason || 'Khác',
      fromDate: data.fromDate || '',
      toDate: data.toDate || '',
      status: Status.PENDING,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
      ...data
    };
    MOCK_DATA = [newRequest, ...MOCK_DATA];
    return { success: true, data: newRequest };
  },

  updateRequest: async (id: string, updates: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> => {
    if (isGAS) {
      return await serverCall('api_updateRequest', id, updates);
    }

    await delay(600);
    const index = MOCK_DATA.findIndex(r => r.id === id);
    if (index === -1) return { success: false, message: 'Not found' };
    MOCK_DATA[index] = { ...MOCK_DATA[index], ...updates };
    return { success: true, data: MOCK_DATA[index] };
  },

  deleteRequest: async (id: string): Promise<ApiResponse<string>> => {
    if (isGAS) {
      return await serverCall('api_deleteRequest', id);
    }

    await delay(600);
    MOCK_DATA = MOCK_DATA.filter(r => r.id !== id);
    return { success: true, message: 'Deleted' };
  },

  // 4. File Upload (Handling Base64 for GAS)
  uploadFile: async (file: File): Promise<string> => {
    if (isGAS) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = (e.target?.result as string).split(',')[1]; // Get Base64 part
          try {
            const url = await serverCall('api_uploadFile', content, file.name, file.type);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    await delay(1000);
    return `https://fake-drive-link.com/${file.name}`;
  },

  // 5. Reporting
  getStats: async (): Promise<DashboardStats> => {
    // Stats are calculated on frontend based on 'loadAllConfigData' usually, 
    // but if we need direct server calc:
    await delay(300);
    return {
      total: MOCK_DATA.length,
      pending: MOCK_DATA.filter(r => r.status === Status.PENDING).length,
      approved: MOCK_DATA.filter(r => r.status === Status.APPROVED).length,
      rejected: MOCK_DATA.filter(r => r.status === Status.REJECTED).length,
    };
  }
};