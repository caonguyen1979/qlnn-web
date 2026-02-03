
import { User, Role, LeaveRequest, Status, ApiResponse, DashboardStats, SystemConfigData } from '../types';

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxzZGX6G6LASRT_kudGvRO69iVyZ81bfr0WDXcA0G5GKjHXngkCu-GMwnhdO26stHoE/exec"; 

const isGAS = typeof window !== 'undefined' && (window as any).google && (window as any).google.script;
const isPlaceholderUrl = GAS_API_URL.includes("AKfycbyvj5mG2y9_Ym6_Zz5XqXqXqXqXq");

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
    // Return mock data for development
    return { success: true, message: "Mock response" };
  }

  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: funcName, args: args })
    });
    return await response.json();
  } catch (error) {
    console.error("API Call Error:", error);
    return { success: false, message: error.toString() };
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
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 4 * 1024 * 1024; // 4MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Chỉ chấp nhận file ảnh (.jpg, .png) hoặc PDF");
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
  }
};
