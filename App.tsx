
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Role, LeaveRequest, Status, SystemConfigData } from './types';
import { gasService } from './services/gasService';
import { LEAVE_REQUEST_CONFIG, APP_NAME, PERMISSIONS } from './constants';
import { DynamicForm } from './components/DynamicForm';
import { DashboardChart } from './components/DashboardChart';
import { UserManagement } from './components/UserManagement';
import { SystemSettings } from './components/SystemSettings';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Icons
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
  Lock,
  User as UserIcon,
  Calendar,
  Eye, 
  ImageIcon,
  GraduationCap
} from 'lucide-react';

const SESSION_KEY = 'eduleave_session';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'settings'>('dashboard');
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [systemConfig, setSystemConfig] = useState<SystemConfigData>({ classes: [], reasons: [], schoolName: APP_NAME, currentWeek: 1 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); 

  const [selectedDashboardWeek, setSelectedDashboardWeek] = useState<number>(0);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWeek, setFilterWeek] = useState(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const init = async () => {
      try {
        const configRes = await gasService.getSystemConfig();
        if (configRes.success && configRes.data) {
           setSystemConfig(prev => ({ ...prev, ...configRes.data }));
           setSelectedDashboardWeek(Number(configRes.data.currentWeek));
        }
      } catch (e) { console.warn("Config load failed:", e); }

      const storedSession = localStorage.getItem(SESSION_KEY);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (new Date().getTime() < parsed.expiry) {
          setUser(parsed.user);
          loadData();
        } else { localStorage.removeItem(SESSION_KEY); }
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadData = async () => {
    const result = await gasService.loadAllConfigData();
    setData(result.requests);
    setAllUsers(result.users);
    if (result.config) {
      setSystemConfig(prev => ({ ...prev, ...result.config }));
      if (!selectedDashboardWeek && result.config.currentWeek) {
        setSelectedDashboardWeek(Number(result.config.currentWeek));
      }
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const datePart = dateString.split('T')[0]; 
    const parts = datePart.split('-');
    if (parts.length === 3) { return `${parts[2]}/${parts[1]}/${parts[0]}`; }
    return dateString;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await gasService.login(username, password);
      if (res.success && res.data) {
        setUser(res.data);
        const expiry = new Date().getTime() + 4 * 60 * 60 * 1000;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: res.data, expiry }));
        loadData();
      } else { setAuthError(res.message || 'Đăng nhập thất bại'); }
    } catch (err) { setAuthError('Lỗi kết nối'); } finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setData([]);
    setActiveTab('dashboard');
  };

  const handleCreate = async (formData: any) => {
    if (!user) return;
    setIsSubmitting(true);
    const tempId = `TEMP-${Date.now()}`;
    const optimisticItem: LeaveRequest = {
      id: tempId, 
      studentName: user.role === Role.HS ? user.fullname : (formData.studentName || 'Chưa rõ'),
      class: user.role === Role.HS ? (user.class || '') : (formData.class || ''),
      week: formData.week || systemConfig.currentWeek, reason: formData.reason,
      fromDate: formData.fromDate, toDate: formData.toDate, status: Status.PENDING,
      createdBy: user.username, createdAt: new Date().toISOString(), ...formData
    };
    setData(prev => [optimisticItem, ...prev]);
    setIsModalOpen(false);
    try {
      const res = await gasService.createRequest(formData, user);
      if (res.success && res.data) {
        setData(prev => prev.map(item => item.id === tempId ? res.data! : item));
      } else throw new Error();
    } catch (err) {
      setData(prev => prev.filter(item => item.id !== tempId));
      alert("Lỗi khi lưu dữ liệu.");
    } finally { setIsSubmitting(false); }
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
    } finally { setIsSubmitting(false); }
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
    setData(prev => prev.map(item => item.id === id ? { ...item, status: newStatus, approver: user?.fullname || user?.username } : item));
    try {
      await gasService.updateRequest(id, { status: newStatus, approver: user?.fullname || user?.username });
    } catch (err) {
      setData(previousData);
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const availableWeeks = useMemo(() => {
    const weeks = new Set<number>();
    if (systemConfig.currentWeek) weeks.add(Number(systemConfig.currentWeek));
    data.forEach(item => { if (item.week) weeks.add(Number(item.week)); });
    return Array.from(weeks).sort((a, b) => b - a);
  }, [data, systemConfig]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const sName = item.studentName || '';
      const sId = item.id || '';
      const matchesSearch = sName.toLowerCase().includes(searchTerm.toLowerCase()) || sId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = filterClass ? item.class === filterClass : true;
      const matchesStatus = filterStatus ? item.status === filterStatus : true;
      const matchesWeek = filterWeek ? String(item.week) === String(filterWeek) : true;
      const permissionCheck = user?.role === Role.HS ? item.createdBy === user.username : true;
      return matchesSearch && matchesClass && matchesStatus && matchesWeek && permissionCheck;
    });
  }, [data, searchTerm, filterClass, filterStatus, filterWeek, user]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const formConfig = useMemo(() => {
    let baseConfig = LEAVE_REQUEST_CONFIG;
    if (systemConfig.classes.length > 0) baseConfig = baseConfig.map(col => col.key === 'class' ? { ...col, options: systemConfig.classes } : col);
    if (systemConfig.reasons.length > 0) baseConfig = baseConfig.map(col => col.key === 'reason' ? { ...col, options: systemConfig.reasons } : col);
    
    if (user && user.role === Role.HS) {
      let studentConfig = baseConfig.filter(c => !['status', 'studentName', 'class'].includes(c.key));
      const todayStr = new Date().toISOString().split('T')[0];
      studentConfig = studentConfig.map(col => {
        if (col.key === 'week') return { ...col, min: systemConfig.currentWeek };
        if (col.key === 'fromDate') return { ...col, min: todayStr };
        return col;
      });
      return studentConfig;
    }
    return baseConfig.filter(c => c.key !== 'status' || PERMISSIONS[user?.role || Role.VIEWER].canApprove);
  }, [systemConfig, user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[600px] border border-gray-100">
          <div className="hidden md:flex md:w-1/2 bg-primary p-12 flex-col justify-center text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <h1 className="text-4xl font-black mb-6 leading-tight uppercase tracking-tight">{systemConfig.schoolName}</h1>
              <div className="w-16 h-1.5 bg-white mb-6 rounded-full"></div>
              <p className="text-lg opacity-90 font-medium">Hệ thống quản lý nghỉ phép thông minh cho nhà trường.</p>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
            {/* Logo di chuyển sang thẻ bên phải, nằm trên tiêu đề Đăng nhập */}
            <div className="flex flex-col items-start mb-8">
              <div className="w-24 h-24 mb-6">
                <img src="logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=Logo' }} />
              </div>
              <h2 className="text-4xl font-black text-gray-800 tracking-tight">Đăng nhập</h2>
            </div>

            {authError && <div className="mb-6 text-red-500 font-bold bg-red-50 p-4 rounded-xl border border-red-100 flex items-center shadow-sm animate-pulse"><XCircle size={18} className="mr-2 shrink-0"/>{authError}</div>}
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tài khoản</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input type="text" placeholder="Tên đăng nhập" required className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-medium" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mật khẩu</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input type="password" placeholder="Mật khẩu" required className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-medium" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <button type="submit" disabled={authLoading} className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/25 hover:bg-blue-600 active:scale-[0.98] transition-all transform uppercase tracking-widest text-sm">
                {authLoading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const canCreate = user.role === Role.HS || user.role === Role.ADMIN || user.role === Role.USER || user.role === Role.GVCN;
  const canApprove = PERMISSIONS[user.role].canApprove;
  const canDelete = PERMISSIONS[user.role].canDelete;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-300 ease-in-out z-50 flex flex-col bg-white border-r border-gray-200 ${sidebarCollapsed ? 'md:w-0 overflow-hidden' : 'w-72 md:w-72'}`}>
        <div className="h-20 flex items-center px-8 border-b border-gray-100 bg-gray-50/30">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-md border border-gray-100 overflow-hidden">
            <img src="logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=L' }} />
          </div>
          <span className="text-lg font-black text-gray-800 truncate">{systemConfig.schoolName}</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto text-gray-500"><X size={24}/></button>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutDashboard size={22} /><span>Tổng quan</span></button>
          <button onClick={() => { setActiveTab('requests'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${activeTab === 'requests' ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}><FileText size={22} /><span>Quản lý đơn</span></button>
          {user.role === Role.ADMIN && (<button onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50'}`}><Settings size={22} /><span>Cài đặt hệ thống</span></button>)}
        </nav>
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-primary flex items-center justify-center font-bold">{user.fullname?.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.fullname}</p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-black text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"><LogOut size={18} /><span>ĐĂNG XUẤT</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 no-print">
          <div className="flex items-center">
            {/* Sửa nút menu mobile để hoạt động chính xác */}
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 mr-4 p-2 bg-gray-50 rounded-lg focus:outline-none active:bg-gray-200 transition-colors">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">{activeTab === 'dashboard' ? 'Thống kê' : activeTab === 'requests' ? 'Quản lý đơn' : 'Cài đặt'}</h2>
          </div>
          <div className="flex items-center space-x-3">
             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${user.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{user.role}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 main-content">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto">
               {/* Bộ lọc tuần thống kê hiển thị rõ ràng */}
               <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm no-print gap-3">
                  <div className="flex items-center space-x-2">
                    <Calendar size={18} className="text-primary" />
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-widest">Xem dữ liệu tuần:</span>
                  </div>
                  <select className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-2.5 text-sm font-black outline-none focus:border-primary transition-all cursor-pointer" value={selectedDashboardWeek} onChange={(e) => setSelectedDashboardWeek(Number(e.target.value))}>
                    {availableWeeks.map(w => <option key={w} value={w}>TUẦN {w}</option>)}
                  </select>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 no-print">
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tổng đơn (T{selectedDashboardWeek})</p>
                    <p className="text-3xl font-black text-gray-800">{data.filter(r => Number(r.week) === selectedDashboardWeek).length}</p>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Đang chờ</p>
                    <p className="text-3xl font-black text-yellow-500">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.PENDING).length}</p>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Đã duyệt</p>
                    <p className="text-3xl font-black text-green-500">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.APPROVED).length}</p>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Từ chối</p>
                    <p className="text-3xl font-black text-red-500">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.REJECTED).length}</p>
                 </div>
              </div>
              <DashboardChart allData={data} systemConfig={systemConfig} selectedWeek={selectedDashboardWeek} />
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6 space-y-4 no-print">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[280px]"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Tìm tên, ID..." className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:border-primary outline-none text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <select className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}><option value="">Mọi tuần</option>{availableWeeks.map(w => <option key={w} value={w}>Tuần {w}</option>)}</select>
                    <select className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}><option value="">Mọi lớp</option>{systemConfig.classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <select className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">Mọi trạng thái</option>{Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                  {canCreate && (<button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center space-x-2 shadow-xl shadow-primary/25 transition-all"><Plus size={20} /><span>TẠO ĐƠN</span></button>)}
                </div>
              </div>

              {/* MOBILE CARD VIEW - HIỂN THỊ ĐẦY ĐỦ THÔNG TIN THEO YÊU CẦU */}
              <div className="md:hidden flex-1 overflow-auto space-y-4 no-print pb-10">
                {paginatedData.length === 0 ? (<div className="text-center py-20 text-gray-400 font-bold">Không tìm thấy đơn vắng học</div>) : (
                  paginatedData.map(item => (
                    <div key={item.id} className="bg-white rounded-3xl shadow-md p-5 border border-gray-100 relative overflow-hidden active:scale-[0.99] transition-transform">
                      {/* Status accent bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.status === Status.APPROVED ? 'bg-green-500' : item.status === Status.REJECTED ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                      
                      <div className="flex justify-between items-start mb-4 pl-2">
                         <div className="flex-1">
                            <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{item.studentName} - {item.class}</h4>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tuần {item.week}</p>
                         </div>
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm ${item.status === Status.APPROVED ? 'bg-green-50 text-green-700 border border-green-100' : item.status === Status.REJECTED ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>{item.status}</span>
                      </div>

                      <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 mb-4">
                         {/* Ngày vắng */}
                         <div className="flex items-start space-x-3">
                            <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                               <span className="text-[10px] text-gray-400 uppercase font-black block leading-none mb-1">Ngày vắng</span>
                               <span className="text-sm text-gray-800 font-bold">
                                 {formatDateDisplay(item.fromDate)} {item.fromDate !== item.toDate ? ` đến ${formatDateDisplay(item.toDate)}` : ''}
                               </span>
                            </div>
                         </div>
                         {/* Lý do vắng */}
                         <div className="flex items-start space-x-3">
                            <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                               <span className="text-[10px] text-gray-400 uppercase font-black block leading-none mb-1">Lý do vắng</span>
                               <span className="text-sm text-gray-700 font-medium leading-relaxed">{item.reason}</span>
                            </div>
                         </div>
                         {/* Người duyệt đơn - Hiển thị tên đầy đủ nếu đã duyệt/từ chối */}
                         <div className="flex items-start space-x-3 border-t border-gray-200/50 pt-3 mt-1">
                            <CheckCircle size={16} className={`${item.status !== Status.PENDING ? 'text-green-500' : 'text-gray-300'} mt-0.5 shrink-0`} />
                            <div className="flex-1">
                               <span className="text-[10px] text-gray-400 uppercase font-black block leading-none mb-1">Người duyệt đơn</span>
                               <span className="text-sm font-black text-gray-900 min-h-[1.25rem] block">
                                 {item.status !== Status.PENDING ? (item.approver || 'Ban Giám Hiệu') : ''}
                               </span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex space-x-2">
                           {item.attachmentUrl && (<button onClick={() => setPreviewImageUrl(item.attachmentUrl || '')} className="flex items-center space-x-2 text-primary text-xs font-black bg-blue-50 px-3 py-2.5 rounded-xl border border-blue-100 active:scale-95 transition-all"><ImageIcon size={16}/> <span>Xem minh chứng</span></button>)}
                         </div>
                         <div className="flex items-center space-x-2">
                           {canApprove && item.status === Status.PENDING && (
                             <><button onClick={() => handleStatusChange(item.id, Status.APPROVED)} className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100 active:scale-90 transition-all"><CheckCircle size={20}/></button><button onClick={() => handleStatusChange(item.id, Status.REJECTED)} className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 active:scale-90 transition-all"><XCircle size={20}/></button></>
                           )}
                           {canDelete && (<button onClick={() => handleDelete(item.id)} className="p-3 bg-gray-50 text-gray-400 rounded-xl border border-gray-200 active:scale-90 transition-all"><Trash2 size={20}/></button>)}
                           {(user.username === item.createdBy || user.role === Role.ADMIN) && item.status === Status.PENDING && (<button onClick={() => {setEditingItem(item); setIsModalOpen(true);}} className="p-3 bg-blue-50 text-blue-500 rounded-xl border border-blue-100 active:scale-90 transition-all"><Edit2 size={20}/></button>)}
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 overflow-auto flex-1">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50/50 border-b sticky top-0 tracking-widest z-10">
                    <tr>
                      <th className="px-6 py-4">Tuần</th>
                      <th className="px-6 py-4">Học sinh</th>
                      <th className="px-6 py-4">Lớp</th>
                      <th className="px-6 py-4">Ngày nghỉ</th>
                      <th className="px-6 py-4">Lý do</th>
                      <th className="px-6 py-4 text-center">Minh chứng</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4">Người duyệt</th>
                      <th className="px-6 py-4 text-center no-print">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-5 font-black text-gray-400">{item.week}</td>
                        <td className="px-6 py-5 font-bold text-gray-900">{item.studentName}</td>
                        <td className="px-6 py-5 font-medium">{item.class}</td>
                        <td className="px-6 py-5 whitespace-nowrap font-medium text-gray-700">{formatDateDisplay(item.fromDate)} {item.fromDate !== item.toDate && ` - ${formatDateDisplay(item.toDate)}`}</td>
                        <td className="px-6 py-5 text-gray-500 max-w-xs truncate">{item.reason}</td>
                        <td className="px-6 py-5 text-center">
                          {item.attachmentUrl ? (
                            <button onClick={() => setPreviewImageUrl(item.attachmentUrl || '')} className="p-2 text-primary hover:bg-blue-50 rounded-xl transition-colors">
                              <Eye size={18} />
                            </button>
                          ) : (
                            <span className="text-gray-200">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${item.status === Status.APPROVED ? 'bg-green-50 text-green-700 border-green-100' : item.status === Status.REJECTED ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-xs font-bold text-gray-800">
                          {item.status !== Status.PENDING ? (item.approver || 'Ban Giám Hiệu') : ''}
                        </td>
                        <td className="px-6 py-5 text-center no-print">
                            <div className="flex items-center justify-center space-x-1">
                              {canApprove && item.status === Status.PENDING && (
                                <>
                                  <button onClick={() => handleStatusChange(item.id, Status.APPROVED)} className="text-green-600 p-2 hover:bg-green-50 rounded-lg transition-colors" title="Duyệt đơn"><CheckCircle size={20} /></button>
                                  <button onClick={() => handleStatusChange(item.id, Status.REJECTED)} className="text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Từ chối"><XCircle size={20} /></button>
                                </>
                              )}
                              {canDelete && (<button onClick={() => handleDelete(item.id)} className="text-gray-400 p-2 hover:bg-gray-50 rounded-lg transition-colors" title="Xóa đơn"><Trash2 size={20} /></button>)}
                              {(user.username === item.createdBy || user.role === Role.ADMIN) && item.status === Status.PENDING && (<button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa đơn"><Edit2 size={20} /></button>)}
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && user.role === Role.ADMIN && (
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
              <UserManagement users={allUsers} onRefresh={loadData} classes={systemConfig.classes} />
              <SystemSettings config={systemConfig} onRefresh={loadData} />
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-8 py-5 border-b bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{editingItem ? 'CẬP NHẬT ĐƠN VẮNG' : 'TẠO ĐƠN VẮNG MỚI'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <DynamicForm 
                config={formConfig} 
                initialData={editingItem || { week: systemConfig.currentWeek }} 
                onSubmit={editingItem ? handleUpdate : handleCreate} 
                onCancel={() => setIsModalOpen(false)} 
                isSubmitting={isSubmitting} 
              />
            </div>
          </div>
        </div>
      )}
      
      <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </div>
  );
};

export default App;
