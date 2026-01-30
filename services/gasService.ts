import { User, Role, LeaveRequest, Status, ApiResponse, DashboardStats, SystemConfigData } from '../types';

// --- CONFIGURATION ---
// QUAN TRỌNG: Thay thế URL này bằng Web App URL của bạn sau khi deploy GAS
// URL có dạng: https://script.google.com/macros/s/AKfycbx.../exec
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxzZGX6G6LASRT_kudGvRO69iVyZ81bfr0WDXcA0G5GKjHXngkCu-GMwnhdO26stHoE/exec"; // <-- THAY URL CỦA BẠN VÀO ĐÂY

// --- HELPER: DETECT ENVIRONMENT ---
// Check if we are running inside Google Apps Script iFrame
const isGAS = typeof window !== 'undefined' && (window as any).google && (window as any).google.script;

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

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAIN SERVICE ---

export const gasService = {
  // 1. System Config & Initialization
  loadAllConfigData: async (): Promise<{ users: User[], requests: LeaveRequest[], config: SystemConfigData }> => {
    try {
      return await serverCall('api_loadAllConfigData');
    } catch (e) {
      console.warn("Falling back to mock data due to API error", e);
      await delay(800);
      return { 
        users: [], 
        requests: [],
        config: { classes: [], reasons: [], schoolName: "Trường Mẫu" }
      };
    }
  },

  saveSystemConfig: async (config: SystemConfigData): Promise<ApiResponse<void>> => {
    return await serverCall('api_saveSystemConfig', config);
  },

  // 2. Auth
  login: async (username: string, password?: string): Promise<ApiResponse<User>> => {
    return await serverCall('api_login', username, password);
  },

  register: async (data: {username: string, password: string, fullname: string, email: string}): Promise<ApiResponse<User>> => {
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
    // We pass user info to backend to verify creator
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
