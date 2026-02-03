
import { User, Role, LeaveRequest, Status, ApiResponse, DashboardStats, SystemConfigData } from '../types';

// --- CONFIGURATION ---
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxzZGX6G6LASRT_kudGvRO69iVyZ81bfr0WDXcA0G5GKjHXngkCu-GMwnhdO26stHoE/exec"; 

const isGAS = typeof window !== 'undefined' && (window as any).google && (window as any).google.script;
const isPlaceholderUrl = GAS_API_URL.includes("AKfycbyvj5mG2y9_Ym6_Zz5XqXqXqXqXq");

const getToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const MOCK_USERS: User[] = [
  { id: 'u1', username: 'admin', fullname: 'Quản Trị Viên (Demo)', role: Role.ADMIN, class: '' },
  { id: 'u2', username: 'hs1', fullname: 'Nguyễn Văn A (Demo)', role: Role.HS, class: '10A1' },
  { id: 'u3', username: 'gv1', fullname: 'GVCN Lớp 10A1', role: Role.GVCN, class: '10A1' },
];

const MOCK_REQUESTS: LeaveRequest[] = [
  { 
    id: 'demo1', studentName: 'Nguyễn Văn A', class: '10A1', week: 1, 
    reason: 'Ốm đau', fromDate: getToday(-1), toDate: getToday(0), 
    status: Status.APPROVED, createdBy: 'hs1', createdAt: new Date().toISOString(), approver: 'Quản Trị Viên (Demo)'
  },
  { 
    id: 'demo2', studentName: 'Trần Thị B', class: '11A2', week: 1, 
    reason: 'Việc gia đình', fromDate: getToday(1), toDate: getToday(1), 
    status: Status.PENDING, createdBy: 'gv1', createdAt: new Date().toISOString() 
  }
];

const handleMockCall = (funcName: string, ...args: any[]): any => {
  switch (funcName) {
    case 'api_login':
      const [u, p] = args;
      const user = MOCK_USERS.find(user => user.username === u);
      if (user || u === 'admin') {
         return { success: true, data: user || MOCK_USERS[0] };
      }
      return { success: false, message: 'Sai tài khoản hoặc mật khẩu' };
      
    case 'api_loadAllConfigData':
      return { 
        users: MOCK_USERS, 
        requests: MOCK_REQUESTS,
        config: { classes: ['10A1', '10A2', '11A1'], reasons: ['Ốm', 'Việc riêng'], schoolName: 'Trường Demo', currentWeek: 1 }
      };

    case 'api_getSystemConfig':
      return {
        success: true,
        data: { classes: ['10A1', '10A2', '11A1'], reasons: ['Ốm', 'Việc riêng'], schoolName: 'Trường Demo', currentWeek: 1 }
      };
      
    case 'api_createRequest':
      return { success: true, data: { ...args[0], id: `mock-${Date.now()}`, status: Status.PENDING, createdAt: new Date().toISOString() } };
      
    case 'api_updateRequest':
    case 'api_deleteRequest':
    case 'api_createUser':
    case 'api_updateUser':
    case 'api_deleteUser':
    case 'api_saveSystemConfig':
      return { success: true, message: 'Thao tác thành công' };

    case 'api_uploadFile':
      return "https://via.placeholder.com/150?text=Uploaded+File";

    default:
      return { success: false, message: 'Mock function not implemented' };
  }
};

const serverCall = async (funcName: string, ...args: any[]): Promise<any> => {
  if (isGAS) {
    return new Promise((resolve, reject) => {
      (window as any).google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [funcName](...args);
    });
  }

  if (isPlaceholderUrl) {
    await new Promise(r => setTimeout(r, 300));
    return handleMockCall(funcName, ...args);
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: funcName, args: args })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    return handleMockCall(funcName, ...args);
  }
};

export const gasService = {
  loadAllConfigData: async (): Promise<{ users: User[], requests: LeaveRequest[], config: SystemConfigData }> => {
    return await serverCall('api_loadAllConfigData');
  },
  getSystemConfig: async (): Promise<ApiResponse<SystemConfigData>> => {
    return await serverCall('api_getSystemConfig');
  },
  saveSystemConfig: async (config: SystemConfigData): Promise<ApiResponse<void>> => {
    return await serverCall('api_saveSystemConfig', config);
  },
  login: async (username: string, password?: string): Promise<ApiResponse<User>> => {
    return await serverCall('api_login', username, password);
  },
  register: async (data: any): Promise<ApiResponse<User>> => {
    return await serverCall('api_register', data);
  },
  createUser: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return await serverCall('api_createUser', data);
  },
  updateUser: async (id: string, updates: Partial<User>): Promise<ApiResponse<User>> => {
    return await serverCall('api_updateUser', id, updates);
  },
  deleteUser: async (id: string): Promise<ApiResponse<string>> => {
    return await serverCall('api_deleteUser', id);
  },
  createRequest: async (data: Partial<LeaveRequest>, user: User): Promise<ApiResponse<LeaveRequest>> => {
    return await serverCall('api_createRequest', data, JSON.stringify(user));
  },
  updateRequest: async (id: string, updates: Partial<LeaveRequest>): Promise<ApiResponse<LeaveRequest>> => {
    return await serverCall('api_updateRequest', id, updates);
  },
  deleteRequest: async (id: string): Promise<ApiResponse<string>> => {
    return await serverCall('api_deleteRequest', id);
  },
  uploadFile: async (file: File): Promise<string> => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    const maxSize = 4 * 1024 * 1024; // 4MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Chỉ chấp nhận file ảnh (.jpg, .png)");
    }
    if (file.size > maxSize) {
      throw new Error("Dung lượng file không được quá 4MB");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = (e.target?.result as string).split(',')[1];
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
  getStats: async (): Promise<DashboardStats> => {
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
};
