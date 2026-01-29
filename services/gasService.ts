import { User, Role, LeaveRequest, Status, ApiResponse, DashboardStats } from '../types';

// --- CONFIGURATION ---
// QUAN TRỌNG: Thay thế URL này bằng Web App URL của bạn sau khi deploy GAS
// URL có dạng: https://script.google.com/macros/s/AKfycbx.../exec
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwvqG1tKPK1_dY1A_mPFIfNTTwp5NSjgRa7EjgpWPp2y4Enubj8DX5oDXp1GRzgj2l2/exec"; // <-- THAY URL CỦA BẠN VÀO ĐÂY

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
  // Note: We use 'no-cors' mode limitation workaround by using text/plain or standard POST
  // Ensure your GAS Web App is deployed as: "Execute as: Me", "Who has access: Anyone"
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
    // Fallback logic could go here, but for now allow fail
    throw error;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- MAIN SERVICE ---

export const gasService = {
  // 1. System Config & Initialization
  loadAllConfigData: async (): Promise<{ users: User[], requests: LeaveRequest[] }> => {
    try {
      return await serverCall('api_loadAllConfigData');
    } catch (e) {
      console.warn("Falling back to mock data due to API error", e);
      // Fallback only if API fails completely (e.g. invalid URL)
      await delay(800);
      return { 
        users: [
          { id: 'u1', username: 'admin', fullname: 'Admin Mẫu (Offline)', role: Role.ADMIN },
        ], 
        requests: [] 
      };
    }
  },

  // 2. Auth
  login: async (username: string): Promise<ApiResponse<User>> => {
    return await serverCall('api_login', username);
  },

  // 3. CRUD Operations
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

  // 4. File Upload (Handling Base64 for GAS)
  uploadFile: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = (e.target?.result as string).split(',')[1]; // Get Base64 part
        try {
          // Note: Sending large base64 strings via fetch might hit limits or timeout.
          const url = await serverCall('api_uploadFile', content, file.name, file.type);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsDataURL(file);
    });
  },

  // 5. Reporting
  getStats: async (): Promise<DashboardStats> => {
    // This function is purely client-side logic usually based on loaded data
    // But keeping structure for interface consistency
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
  }
};
