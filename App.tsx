import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, LeaveRequest, Status } from './types';
import { gasService } from './services/gasService';
import { LEAVE_REQUEST_CONFIG, APP_NAME, PERMISSIONS } from './constants';
import { DynamicForm } from './components/DynamicForm';
import { DashboardChart } from './components/DashboardChart';
import { 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Menu, 
  X, 
  Plus, 
  Search, 
  CheckCircle,
  XCircle,
  Trash2,
  Edit2,
  Mail,
  Lock,
  User as UserIcon,
  ArrowLeft
} from 'lucide-react';

const SESSION_KEY = 'eduleave_session';

type AuthMode = 'login' | 'register' | 'forgot';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'settings'>('dashboard');
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth State
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  
  // Login Inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register Inputs
  const [regFullname, setRegFullname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  // Forgot Inputs
  const [forgotEmail, setForgotEmail] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      // Check session
      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        // Simple expiry check (4 hours)
        if (new Date().getTime() < parsed.expiry) {
          setUser(parsed.user);
          loadData();
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async () => {
    const result = await gasService.loadAllConfigData();
    setData(result.requests);
  };

  // --- Auth Handlers ---
  const clearAuthStates = () => {
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthStates();
    setAuthLoading(true);
    try {
      const res = await gasService.login(username, password);
      if (res.success && res.data) {
        setUser(res.data);
        const expiry = new Date().getTime() + 4 * 60 * 60 * 1000;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: res.data, expiry }));
        loadData();
      } else {
        setAuthError(res.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setAuthError('Lỗi kết nối đến server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthStates();
    setAuthLoading(true);
    try {
      const res = await gasService.register({
        username: regUsername,
        password: regPassword,
        fullname: regFullname,
        email: regEmail
      });
      
      if (res.success) {
        setAuthSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
        setTimeout(() => setAuthMode('login'), 2000);
      } else {
        setAuthError(res.message || 'Đăng ký thất bại');
      }
    } catch (err) {
      setAuthError('Lỗi kết nối server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthStates();
    setAuthLoading(true);
    try {
      const res = await gasService.resetPassword(forgotEmail);
      if (res.success) {
        setAuthSuccess(res.message || 'Đã gửi email khôi phục.');
      } else {
        setAuthError(res.message || 'Lỗi khôi phục');
      }
    } catch (err) {
      setAuthError('Lỗi kết nối server');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setData([]);
    setUsername('');
    setPassword('');
  };

  // --- CRUD & Optimistic UI ---
  const handleCreate = async (formData: any) => {
    if (!user) return;
    setIsSubmitting(true);
    
    // Optimistic Update
    const tempId = `TEMP-${Date.now()}`;
    const optimisticItem: LeaveRequest = {
      id: tempId,
      studentName: user.role === Role.HS ? user.fullname : formData.studentName,
      class: user.role === Role.HS ? user.class! : formData.class,
      reason: formData.reason,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      status: Status.PENDING,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
      ...formData
    };

    setData(prev => [optimisticItem, ...prev]);
    setIsModalOpen(false);

    try {
      const res = await gasService.createRequest(formData, user);
      if (res.success && res.data) {
        setData(prev => prev.map(item => item.id === tempId ? res.data! : item));
      } else {
        throw new Error("Failed");
      }
    } catch (err) {
      setData(prev => prev.filter(item => item.id !== tempId));
      alert("Lỗi khi lưu dữ liệu. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData: any) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    
    const previousData = [...data];
    setData(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formData } : item));
    setIsModalOpen(false);
    setEditingItem(null);

    try {
      const res = await gasService.updateRequest(editingItem.id, formData);
      if (!res.success) throw new Error();
    } catch (err) {
      setData(previousData);
      alert("Cập nhật thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;
    
    const previousData = [...data];
    setData(prev => prev.filter(item => item.id !== id));

    try {
      const res = await gasService.deleteRequest(id);
      if (!res.success) throw new Error();
    } catch (err) {
      setData(previousData);
      alert("Xóa thất bại.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: Status) => {
    const previousData = [...data];
    setData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));

    try {
      await gasService.updateRequest(id, { status: newStatus });
    } catch (err) {
      setData(previousData);
    }
  };

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = filterClass ? item.class === filterClass : true;
      const matchesStatus = filterStatus ? item.status === filterStatus : true;
      const permissionCheck = user?.role === Role.HS ? item.createdBy === user.username : true;

      return matchesSearch && matchesClass && matchesStatus && permissionCheck;
    });
  }, [data, searchTerm, filterClass, filterStatus, user]);


  // --- Render Login / Auth ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px]">
          {/* Left: Illustration */}
          <div className="hidden md:flex md:w-1/2 bg-primary p-12 flex-col justify-center text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-4">{APP_NAME}</h1>
              <p className="text-lg opacity-90">Hệ thống quản lý nghỉ phép học sinh thông minh.</p>
            </div>
          </div>

          {/* Right: Forms */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            
            {/* Header Text */}
            <div className="text-center md:text-left mb-6">
              {authMode === 'login' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-800">Đăng nhập</h2>
                  <p className="text-gray-500">Chào mừng trở lại!</p>
                </>
              )}
              {authMode === 'register' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-800">Đăng ký</h2>
                  <p className="text-gray-500">Tạo tài khoản mới</p>
                </>
              )}
              {authMode === 'forgot' && (
                <>
                  <h2 className="text-2xl font-bold text-gray-800">Quên mật khẩu?</h2>
                  <p className="text-gray-500">Nhập email để lấy lại mật khẩu</p>
                </>
              )}
            </div>

            {/* Notification Messages */}
            {authError && <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{authError}</div>}
            {authSuccess && <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">{authSuccess}</div>}

            {/* LOGIN FORM */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <button type="button" onClick={() => setAuthMode('forgot')} className="text-xs text-primary hover:underline">Quên mật khẩu?</button>
                  </div>
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors">
                  {authLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
                <div className="text-center text-sm text-gray-500 mt-4">
                  Chưa có tài khoản? <button type="button" onClick={() => setAuthMode('register')} className="text-primary font-semibold hover:underline">Đăng ký ngay</button>
                </div>
              </form>
            )}

            {/* REGISTER FORM */}
            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-primary" 
                    value={regFullname} onChange={e => setRegFullname(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-primary" 
                    value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                  <input type="text" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-primary" 
                    value={regUsername} onChange={e => setRegUsername(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                  <input type="password" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-primary" 
                    value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors">
                  {authLoading ? 'Đang đăng ký...' : 'Đăng ký'}
                </button>
                <div className="text-center text-sm mt-4">
                  <button type="button" onClick={() => setAuthMode('login')} className="text-gray-500 hover:text-gray-800">Quay lại đăng nhập</button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {authMode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email đã đăng ký</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors">
                  {authLoading ? 'Đang gửi...' : 'Gửi mật khẩu mới'}
                </button>
                <div className="text-center text-sm mt-4">
                  <button type="button" onClick={() => setAuthMode('login')} className="flex items-center justify-center w-full text-gray-500 hover:text-gray-800">
                    <ArrowLeft size={16} className="mr-1" /> Quay lại
                  </button>
                </div>
              </form>
            )}
            
          </div>
        </div>
      </div>
    );
  }

  // --- Main App Layout ---
  const canCreate = user.role === Role.HS || user.role === Role.ADMIN || user.role === Role.USER;
  const canApprove = PERMISSIONS[user.role].canApprove;
  const canDelete = PERMISSIONS[user.role].canDelete;

  // Filter columns for HS
  const formConfig = user.role === Role.HS 
    ? LEAVE_REQUEST_CONFIG.filter(c => !['status', 'studentName', 'class'].includes(c.key))
    : LEAVE_REQUEST_CONFIG;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col w-64 bg-white border-r border-gray-200 transition-all z-20`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold mr-3">E</div>
          <span className="text-xl font-bold text-gray-800">{APP_NAME}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'requests' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <FileText size={20} />
            <span>Đơn xin phép</span>
          </button>

          {user.role === Role.ADMIN && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Settings size={20} />
              <span>Cài đặt hệ thống</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold uppercase">
              {user.fullname ? user.fullname.charAt(0) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.fullname}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}
      
      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white z-40 transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="p-4 flex justify-between items-center border-b">
            <span className="font-bold text-xl">{APP_NAME}</span>
            <button onClick={() => setSidebarOpen(false)}><X size={24} /></button>
         </div>
         <nav className="p-4 space-y-2">
            <button onClick={() => {setActiveTab('dashboard'); setSidebarOpen(false)}} className="block w-full text-left p-3 rounded hover:bg-gray-100">Tổng quan</button>
            <button onClick={() => {setActiveTab('requests'); setSidebarOpen(false)}} className="block w-full text-left p-3 rounded hover:bg-gray-100">Đơn xin phép</button>
            <button onClick={handleLogout} className="block w-full text-left p-3 rounded text-red-500 hover:bg-red-50">Đăng xuất</button>
         </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600">
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 ml-2 md:ml-0">
            {activeTab === 'dashboard' ? 'Tổng quan hệ thống' : activeTab === 'requests' ? 'Quản lý đơn xin phép' : 'Cài đặt'}
          </h2>
          <div className="flex items-center space-x-4">
             <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {user.role}
             </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Tổng đơn</p>
                    <p className="text-2xl font-bold text-gray-800">{data.length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Chờ duyệt</p>
                    <p className="text-2xl font-bold text-yellow-600">{data.filter(i => i.status === Status.PENDING).length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Đã duyệt</p>
                    <p className="text-2xl font-bold text-green-600">{data.filter(i => i.status === Status.APPROVED).length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Từ chối</p>
                    <p className="text-2xl font-bold text-red-600">{data.filter(i => i.status === Status.REJECTED).length}</p>
                 </div>
              </div>

              {user.role === Role.VIEWER && (
                <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg">
                  Tài khoản của bạn đang ở chế độ <b>Viewer</b> (chỉ xem). Vui lòng liên hệ Admin để được cấp quyền tạo đơn hoặc duyệt đơn.
                </div>
              )}

              <DashboardChart data={data} />
            </div>
          )}

          {/* REQUESTS LIST VIEW */}
          {activeTab === 'requests' && (
            <div className="max-w-6xl mx-auto h-full flex flex-col">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-t-xl border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center space-x-2">
                   <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                   <select 
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none bg-white"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                   >
                     <option value="">Tất cả trạng thái</option>
                     {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>

                {canCreate && (
                  <button 
                    onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-sm transition-colors"
                  >
                    <Plus size={18} />
                    <span>Tạo đơn mới</span>
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Mã</th>
                        <th className="px-6 py-3">Học sinh</th>
                        <th className="px-6 py-3">Lớp</th>
                        <th className="px-6 py-3">Ngày nghỉ</th>
                        <th className="px-6 py-3">Lý do</th>
                        <th className="px-6 py-3">Trạng thái</th>
                        {(canApprove || canDelete) && <th className="px-6 py-3 text-center">Hành động</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>
                      ) : (
                        filteredData.map((item) => (
                          <tr key={item.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                            <td className="px-6 py-4">{item.studentName}</td>
                            <td className="px-6 py-4">{item.class}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.fromDate} {item.fromDate !== item.toDate && ` - ${item.toDate}`}
                            </td>
                            <td className="px-6 py-4 truncate max-w-[150px]">{item.reason}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                  ${item.status === Status.APPROVED ? 'bg-green-100 text-green-700' : 
                                    item.status === Status.REJECTED ? 'bg-red-100 text-red-700' : 
                                    'bg-yellow-100 text-yellow-700'}`}>
                                  {item.status}
                                </span>
                            </td>
                            {(canApprove || canDelete) && (
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  {canApprove && item.status === Status.PENDING && (
                                    <>
                                      <button 
                                        onClick={() => handleStatusChange(item.id, Status.APPROVED)} 
                                        className="text-green-600 hover:text-green-800 p-1" title="Duyệt"
                                      >
                                        <CheckCircle size={18} />
                                      </button>
                                      <button 
                                        onClick={() => handleStatusChange(item.id, Status.REJECTED)} 
                                        className="text-red-600 hover:text-red-800 p-1" title="Từ chối"
                                      >
                                        <XCircle size={18} />
                                      </button>
                                    </>
                                  )}
                                  {canDelete && (
                                    <button 
                                      onClick={() => handleDelete(item.id)}
                                      className="text-gray-400 hover:text-red-500 p-1" title="Xóa"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                  {user.username === item.createdBy && item.status === Status.PENDING && (
                                     <button 
                                      onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                      className="text-blue-500 hover:text-blue-700 p-1" title="Sửa"
                                     >
                                       <Edit2 size={18} />
                                     </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto">
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold mb-4">Cấu hình hệ thống</h3>
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-4 text-sm">
                    Để chỉnh sửa chi tiết các trường dữ liệu, vui lòng truy cập trực tiếp Google Sheet "Config".
                  </div>
               </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                {editingItem ? 'Chỉnh sửa đơn' : 'Tạo đơn xin phép mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <DynamicForm 
                config={formConfig}
                initialData={editingItem || {}}
                onSubmit={editingItem ? handleUpdate : handleCreate}
                onCancel={() => setIsModalOpen(false)}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
