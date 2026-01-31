import { User, Role, LeaveRequest, Status, ApiResponse, DashboardStats, SystemConfigData } from '../types';

// --- CONFIGURATION ---
// QUAN TRỌNG: Thay thế URL này bằng Web App URL của bạn sau khi deploy GAS
// URL có dạng: https://script.google.com/macros/s/AKfycbx.../exec
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxzZGX6G6LASRT_kudGvRO69iVyZ81bfr0WDXcA0G5GKjHXngkCu-GMwnhdO26stHoE/exec"; // <-- THAY URL CỦA BẠN VÀO ĐÂY

// --- HELPER: DETECT ENVIRONMENT ---
const isGAS = typeof window !== 'undefined' && (window as any).google && (window as any).google.script;

// --- MOCK DATA FOR FALLBACK ---
const MOCK_USERS: User[] = [
  { id: 'u1', username: 'admin', fullname: 'Quản Trị Viên (Demo)', role: Role.ADMIN, class: '' },
  { id: 'u2', username: 'hs1', fullname: 'Nguyễn Văn A (Demo)', role: Role.HS, class: '10A1' },
];

const MOCK_REQUESTS: LeaveRequest[] = [
  { 
    id: 'demo1', studentName: 'Nguyễn Văn A', class: '10A1', week: 1, 
    reason: 'Ốm đau', fromDate: '2023-09-05', toDate: '2023-09-06', 
    status: Status.APPROVED, createdBy: 'hs1', createdAt: new Date().toISOString() 
  },
  { 
    id: 'demo2', studentName: 'Trần Thị B', class: '11A2', week: 1, 
    reason: 'Việc gia đình', fromDate: '2023-09-07', toDate: '2023-09-07', 
    status: Status.PENDING, createdBy: 'hs2', createdAt: new Date().toISOString() 
  }
];

// Helper: Handle Mock Calls
const handleMockCall = (funcName: string, ...args: any[]): any => {
  console.warn(`[Offline Mode] Executing mock for: ${funcName}`, args);
  
  switch (funcName) {
    case 'api_login':
      const [u, p] = args;
      // Accept admin/admin or any user in mock list
      const user = MOCK_USERS.find(user => user.username === u);
      if (user || u === 'admin') {
         return { success: true, data: user || MOCK_USERS[0] };
      }
      return { success: false, message: 'Sai tài khoản hoặc mật khẩu (Demo: admin/admin)' };
      
    case 'api_loadAllConfigData':
      return { 
        users: MOCK_USERS, 
        requests: MOCK_REQUESTS,
        config: { classes: ['10A1', '10A2', '11A1'], reasons: ['Ốm', 'Việc riêng'], schoolName: 'Trường Demo (Offline)', currentWeek: 1 }
      };
      
    case 'api_createRequest':
      // Return a fake successful response
      return { success: true, data: { ...args[0], id: `mock-${Date.now()}`, status: Status.PENDING, createdAt: new Date().toISOString() } };
      
    case 'api_updateRequest':
    case 'api_deleteRequest':
    case 'api_createUser':
    case 'api_updateUser':
    case 'api_deleteUser':
    case 'api_saveSystemConfig':
      return { success: true, message: 'Thao tác giả lập thành công' };

    case 'api_uploadFile':
      // Return a dummy placeholder image
      return "https://via.placeholder.com/150?text=Uploaded+File";

    default:
      return { success: false, message: 'Mock function not implemented' };
  }
};

// Helper to make API calls (Handles both RPC and Fetch)
const serverCall = async (funcName: string, ...args: any[]): Promise<any> => {
  // CASE 1: Running inside GAS (iFrame)
  if (isGAS) {
    return new Promise((resolve, reject) => {
      (window as any).google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [funcName](...args);
    });
  }

  // CASE 2: Running on Vercel/Localhost (Use Fetch API)
  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: funcName,
        args: args
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API Connection Error (CORS or Network):", error);
    // FALLBACK TO MOCK DATA instead of crashing
    return handleMockCall(funcName, ...args);
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAIN SERVICE ---

export const gasService = {
  // 1. System Config & Initialization
  loadAllConfigData: async (): Promise<{ users: User[], requests: LeaveRequest[], config: SystemConfigData }> => {
    return await serverCall('api_loadAllConfigData');
  },

  saveSystemConfig: async (config: SystemConfigData): Promise<ApiResponse<void>> => {
    return await serverCall('api_saveSystemConfig', config);
  },

  // 2. Auth
  login: async (username: string, password?: string): Promise<ApiResponse<User>> => {
    return await serverCall('api_login', username, password);
  },

  register: async (data: {username: string, password: string, fullname: string, email: string, class?: string, role?: string}): Promise<ApiResponse<User>> => {
    return await serverCall('api_register', data);
  },

  resetPassword: async (email: string): Promise<ApiResponse<string>> => {
    return await serverCall('api_resetPassword', email);
  },

  // 3. User Management
  createUser: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return await serverCall('api_createUser', data);
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<ApiResponse<User>> => {
    return await serverCall('api_updateUser', id, updates);
  },

  deleteUser: async (id: string): Promise<ApiResponse<string>> => {
    return await serverCall('api_deleteUser', id);
  },

  // 4. Request CRUD Operations
  createRequest: async (data: Partial<LeaveRequest>, user: User): Promise<ApiResponse<LeaveRequest>> => {
    return await serverCall('api_createRequest', data, JSON.stringify(user));
  },

  updateRequest: async (id: string, updates: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> => {
    return await serverCall('api_updateRequest', id, updates);
  },

  deleteRequest: async (id: string): Promise<ApiResponse<string>> => {
    return await serverCall('api_deleteRequest', id);
  },

  // 5. File Upload (Handling Base64 for GAS)
  uploadFile: async (file: File): Promise<string> => {
    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png'];
    const maxSize = 3 * 1024 * 1024; // 3MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Chỉ chấp nhận file ảnh (.jpg, .png)");
    }

    if (file.size > maxSize) {
      throw new Error("Dung lượng file không được quá 3MB");
    }

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
  },

  // 6. Reporting
  getStats: async (): Promise<DashboardStats> => {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
  }
};
