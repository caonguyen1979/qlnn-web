
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
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  FileDown,
  Columns
} from 'lucide-react';

const SESSION_KEY = 'eduleave_session';

type AuthMode = 'login' | 'register' | 'forgot';

const AVAILABLE_COLUMNS = [
  { key: 'week', label: 'Tuần' },
  { key: 'studentName', label: 'Họ và tên' },
  { key: 'class', label: 'Lớp' },
  { key: 'date', label: 'Ngày nghỉ' }, 
  { key: 'reason', label: 'Lý do' },
  { key: 'attachment', label: 'Minh chứng' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'approver', label: 'Người duyệt' }
];

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
  const [authSuccess, setAuthSuccess] = useState('');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [regFullname, setRegFullname] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUserType, setRegUserType] = useState<Role>(Role.HS);
  const [regClassInfo, setRegClassInfo] = useState('');

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
  const [visibleColumns, setVisibleColumns] = useState<string[]>(AVAILABLE_COLUMNS.map(c => c.key));
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const configRes = await gasService.getSystemConfig();
        if (configRes.success && configRes.data) {
           setSystemConfig(prev => ({ ...prev, ...configRes.data }));
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) { setIsColMenuOpen(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  useEffect(() => {
    if (user && user.role !== Role.ADMIN && activeTab === 'settings') { setActiveTab('dashboard'); }
  }, [user, activeTab]);

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

  const handlePrint = () => { window.print(); };

  const exportToCSV = () => {
    const headers = ['ID', 'Tuần', 'Học sinh', 'Lớp', 'Lý do', 'Từ ngày', 'Đến ngày', 'Trạng thái', 'Người duyệt'];
    const rows = filteredData.map(item => [
      item.id, item.week, item.studentName, item.class, item.reason,
      formatDateDisplay(item.fromDate), formatDateDisplay(item.toDate),
      item.status, item.approver || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bao_cao_nghi_phep_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    try {
      // @ts-ignore
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.text(systemConfig.schoolName, 14, 15);
      doc.setFont("helvetica", "normal");
      doc.text(`Danh sách nghỉ phép - Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 25);
      const tableColumn = ["Tuan", "Hoc sinh", "Lop", "Ly do", "Ngay nghi", "Trang thai", "Nguoi duyet"];
      const tableRows = filteredData.map(item => [
        item.week, item.studentName, item.class, item.reason,
        `${formatDateDisplay(item.fromDate)} - ${formatDateDisplay(item.toDate)}`,
        item.status, item.approver || ''
      ]);
      autoTable(doc, {
        startY: 30, head: [tableColumn], body: tableRows,
        styles: { font: "helvetica", fontSize: 10 },
        headStyles: { fillColor: [13, 110, 253] },
      });
      doc.save(`Bao_cao_nghi_phep_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) { alert("Lỗi khi xuất PDF."); }
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await gasService.register({
        username: regUsername, password: regPassword, fullname: regFullname, class: regClassInfo, role: regUserType
      });
      if (res.success) {
        setAuthSuccess('Đăng ký thành công!');
        setTimeout(() => setAuthMode('login'), 2000);
      } else { setAuthError(res.message || 'Đăng ký thất bại'); }
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
            <div className="relative z-10">
              <h1 className="text-4xl font-black mb-6 leading-tight">{systemConfig.schoolName}</h1>
              <p className="text-lg opacity-90 font-medium">EduLeave - Quản lý vắng học chuyên nghiệp.</p>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center">
            <div className="text-center md:text-left mb-8">
              <h2 className="text-3xl font-black text-gray-800 mb-2">{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h2>
              <p className="text-gray-500 font-medium">Hệ thống quản lý nghỉ phép</p>
            </div>
            
            {authError && <div className="mb-6 text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100 font-bold flex items-center"><XCircle size={18} className="mr-2"/> {authError}</div>}
            {authSuccess && <div className="mb-6 text-green-600 text-sm bg-green-50 p-4 rounded-xl border border-green-100 font-bold flex items-center"><CheckCircle size={18} className="mr-2"/> {authSuccess}</div>}
            
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Tên đăng nhập</label><div className="relative"><UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" required className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium" value={username} onChange={(e) => setUsername(e.target.value)} /></div></div>
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Mật khẩu</label><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="password" required className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-medium" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]">{authLoading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}</button>
                <div className="text-center text-sm text-gray-500 font-medium pt-4">Chưa có tài khoản? <button type="button" onClick={() => setAuthMode('register')} className="text-primary font-bold hover:underline">Đăng ký</button></div>
              </form>
            )}
            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Họ và tên *</label><input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary" value={regFullname} onChange={e => setRegFullname(e.target.value)} /></div>
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Tên đăng nhập *</label><input type="text" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary" value={regUsername} onChange={e => setRegUsername(e.target.value)} /></div>
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Mật khẩu *</label><input type="password" required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary" value={regPassword} onChange={e => setRegPassword(e.target.value)} /></div>
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Vai trò *</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setRegUserType(Role.HS)} className={`flex-1 min-w-[80px] py-2 rounded-lg border text-xs font-bold ${regUserType === Role.HS ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600'}`}>Học sinh</button>
                    <button type="button" onClick={() => setRegUserType(Role.GVCN)} className={`flex-1 min-w-[80px] py-2 rounded-lg border text-xs font-bold ${regUserType === Role.GVCN ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600'}`}>GVCN</button>
                    <button type="button" onClick={() => setRegUserType(Role.VIEWER)} className={`flex-1 min-w-[80px] py-2 rounded-lg border text-xs font-bold ${regUserType === Role.VIEWER ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600'}`}>Khác</button>
                  </div>
                </div>
                {(regUserType === Role.HS || regUserType === Role.GVCN) && (
                  <div><label className="block text-xs font-black text-gray-400 uppercase mb-1">Lớp / Quản lý *</label><select className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-primary" value={regClassInfo} onChange={(e) => setRegClassInfo(e.target.value)} required><option value="">-- Chọn lớp --</option>{systemConfig.classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                )}
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-black py-4 rounded-xl mt-4 shadow-lg shadow-primary/20 transition-all">{authLoading ? 'Đang đăng ký...' : 'ĐĂNG KÝ'}</button>
                <div className="text-center text-sm mt-4"><button type="button" onClick={() => setAuthMode('login')} className="text-gray-500 font-bold hover:text-primary">Quay lại đăng nhập</button></div>
              </form>
            )}
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
      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-20 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72'}`}>
        <div className="h-20 flex items-center px-8 border-b border-gray-100 min-w-[18rem] bg-gray-50/30"><div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black mr-3 shadow-lg shadow-primary/20">EL</div><span className="text-xl font-black text-gray-800 truncate tracking-tight">{systemConfig.schoolName}</span></div>
        <nav className="flex-1 p-6 space-y-2 min-w-[18rem]">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}><LayoutDashboard size={22} /><span>Tổng quan</span></button>
          <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${activeTab === 'requests' ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}><FileText size={22} /><span>Quản lý đơn</span></button>
          {user.role === Role.ADMIN && (<button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${activeTab === 'settings' ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}><Settings size={22} /><span>Cài đặt hệ thống</span></button>)}
        </nav>
        <div className="p-6 border-t border-gray-100 min-w-[18rem]"><div className="flex items-center space-x-4 mb-6 px-2"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-black uppercase shadow-sm border border-white">{user.fullname?.charAt(0) || 'U'}</div><div className="flex-1 min-w-0"><p className="text-sm font-black text-gray-900 truncate">{user.fullname}</p><p className="text-xs font-bold text-gray-400 truncate uppercase tracking-widest">{user.class || user.role}</p></div></div><button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-black text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"><LogOut size={18} /><span>ĐĂNG XUẤT</span></button></div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 no-print">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 mr-4"><Menu size={24} /></button>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">{activeTab === 'dashboard' ? 'Thống kê' : activeTab === 'requests' ? 'Đơn xin phép' : 'Cài đặt'}</h2>
          </div>
          <div className="flex items-center space-x-3">
             <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
               user.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 
               user.role === Role.GVCN ? 'bg-orange-50 text-orange-700 border-orange-100' : 
               'bg-blue-50 text-blue-700 border-blue-100'}`}>
               {user.role}
             </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 main-content">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 no-print">
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tổng đơn</p><p className="text-3xl font-black text-gray-800">{data.filter(r => Number(r.week) === selectedDashboardWeek).length}</p></div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chờ duyệt</p><p className="text-3xl font-black text-yellow-500">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.PENDING).length}</p></div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Đã duyệt</p><p className="text-3xl font-black text-green-500">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.APPROVED).length}</p></div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Từ chối</p><p className="text-3xl font-black text-red-500">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.REJECTED).length}</p></div>
              </div>
              <DashboardChart allData={data} systemConfig={systemConfig} selectedWeek={selectedDashboardWeek} />
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              {/* Toolbar */}
              <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 space-y-4 no-print">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[280px]"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Tìm tên..." className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:border-primary outline-none text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <select className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}><option value="">Tuần học</option>{availableWeeks.map(w => <option key={w} value={w}>Tuần {w}</option>)}</select>
                    <select className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">Trạng thái</option>{Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}</select>
                  </div>
                  {canCreate && (<button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary hover:bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-sm font-black flex items-center justify-center space-x-2 shadow-xl shadow-primary/25 transition-all"><Plus size={20} /><span>TẠO ĐƠN</span></button>)}
                </div>
              </div>

              {/* MOBILE CARD VIEW - FULL DETAILS */}
              <div className="md:hidden flex-1 overflow-auto space-y-4 no-print pb-10">
                {paginatedData.length === 0 ? (<div className="text-center py-20 text-gray-400 font-bold">Chưa có đơn nào</div>) : (
                  paginatedData.map(item => (
                    <div key={item.id} className="bg-white rounded-3xl shadow-md p-5 border border-gray-100 relative overflow-hidden active:scale-[0.99] transition-transform">
                      {/* Status bar indicator */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                        item.status === Status.APPROVED ? 'bg-green-500' : 
                        item.status === Status.REJECTED ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex-1">
                            <h4 className="font-black text-gray-900 text-lg leading-tight">{item.studentName}</h4>
                            <p className="text-sm font-bold text-gray-500">Lớp: <span className="text-gray-800">{item.class}</span></p>
                         </div>
                         <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm ${
                           item.status === Status.APPROVED ? 'bg-green-500 text-white' : 
                           item.status === Status.REJECTED ? 'bg-red-500 text-white' : 
                           'bg-yellow-400 text-yellow-900'
                         }`}>{item.status}</span>
                      </div>

                      <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                         <div className="flex items-start space-x-3">
                            <Calendar size={16} className="text-gray-400 mt-0.5" />
                            <div className="flex-1">
                               <span className="text-[10px] text-gray-400 uppercase font-black block leading-none mb-1">Thời gian vắng</span>
                               <span className="text-sm text-gray-800 font-bold">
                                 {formatDateDisplay(item.fromDate)} {item.fromDate !== item.toDate ? ` đến ${formatDateDisplay(item.toDate)}` : ''}
                               </span>
                            </div>
                         </div>
                         <div className="flex items-start space-x-3">
                            <FileText size={16} className="text-gray-400 mt-0.5" />
                            <div className="flex-1">
                               <span className="text-[10px] text-gray-400 uppercase font-black block leading-none mb-1">Lý do vắng</span>
                               <span className="text-sm text-gray-700 font-medium">{item.reason}</span>
                            </div>
                         </div>
                         {/* Người duyệt đơn */}
                         <div className="flex items-start space-x-3 border-t border-gray-200 pt-3 mt-1">
                            <CheckCircle size={16} className="text-green-500 mt-0.5" />
                            <div className="flex-1">
                               <span className="text-[10px] text-gray-400 uppercase font-black block leading-none mb-1">Người duyệt đơn</span>
                               <span className="text-sm font-black text-gray-900">{item.status !== Status.PENDING ? (item.approver || 'Hệ thống') : ''}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between mt-5">
                         <div className="flex space-x-2">
                           {item.attachmentUrl && (<button onClick={() => setPreviewImageUrl(item.attachmentUrl || '')} className="flex items-center space-x-2 text-primary text-xs font-black bg-blue-50 px-3 py-2 rounded-xl border border-blue-100"><ImageIcon size={16}/> <span>Minh chứng</span></button>)}
                         </div>
                         <div className="flex items-center space-x-2">
                           {canApprove && item.status === Status.PENDING && (
                             <><button onClick={() => handleStatusChange(item.id, Status.APPROVED)} className="p-2.5 bg-green-50 text-green-600 rounded-xl border border-green-100"><CheckCircle size={22}/></button><button onClick={() => handleStatusChange(item.id, Status.REJECTED)} className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100"><XCircle size={22}/></button></>
                           )}
                           {canDelete && (<button onClick={() => handleDelete(item.id)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl border border-gray-100"><Trash2 size={22}/></button>)}
                           {(user.username === item.createdBy || user.role === Role.ADMIN) && item.status === Status.PENDING && (<button onClick={() => {setEditingItem(item); setIsModalOpen(true);}} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl border border-blue-100"><Edit2 size={22}/></button>)}
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 overflow-auto flex-1">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50/50 border-b sticky top-0 z-10 tracking-widest">
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
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5 font-black text-gray-400">{item.week}</td>
                        <td className="px-6 py-5 font-bold text-gray-900">{item.studentName}</td>
                        <td className="px-6 py-5">{item.class}</td>
                        <td className="px-6 py-5 whitespace-nowrap">{formatDateDisplay(item.fromDate)} {item.fromDate !== item.toDate && ` - ${formatDateDisplay(item.toDate)}`}</td>
                        <td className="px-6 py-5 text-gray-500">{item.reason}</td>
                        <td className="px-6 py-5 text-center">{item.attachmentUrl ? (<button onClick={() => setPreviewImageUrl(item.attachmentUrl || '')} className="p-2 text-primary hover:bg-blue-50 rounded-xl"><Eye size={18} /></button>) : (<span className="text-gray-300">-</span>)}</td>
                        <td className="px-6 py-5"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === Status.APPROVED ? 'bg-green-100 text-green-700' : item.status === Status.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>
                        <td className="px-6 py-5 text-xs font-bold">{item.status !== Status.PENDING ? (item.approver || 'Hệ thống') : ''}</td>
                        <td className="px-6 py-5 text-center no-print">
                            <div className="flex items-center justify-center space-x-2">
                              {canApprove && item.status === Status.PENDING && (
                                <><button onClick={() => handleStatusChange(item.id, Status.APPROVED)} className="text-green-600 p-2"><CheckCircle size={20} /></button><button onClick={() => handleStatusChange(item.id, Status.REJECTED)} className="text-red-600 p-2"><XCircle size={20} /></button></>
                              )}
                              {canDelete && (<button onClick={() => handleDelete(item.id)} className="text-gray-400 p-2 hover:bg-gray-50 rounded-lg"><Trash2 size={20} /></button>)}
                              {(user.username === item.createdBy || user.role === Role.ADMIN) && item.status === Status.PENDING && (<button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 p-2"><Edit2 size={20} /></button>)}
                            </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && user.role === Role.ADMIN && (<div className="max-w-5xl mx-auto space-y-8"><UserManagement users={allUsers} onRefresh={loadData} classes={systemConfig.classes} /><SystemSettings config={systemConfig} onRefresh={loadData} /></div>)}
        </div>
      </main>

      {/* Modals... */}
      {isModalOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"><div className="px-8 py-5 border-b bg-gray-50/50 flex justify-between items-center"><h3 className="text-xl font-black text-gray-800">{editingItem ? 'SỬA ĐƠN' : 'TẠO ĐƠN'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div><div className="p-8 overflow-y-auto"><DynamicForm config={formConfig} initialData={editingItem || { week: systemConfig.currentWeek }} onSubmit={editingItem ? handleUpdate : handleCreate} onCancel={() => setIsModalOpen(false)} isSubmitting={isSubmitting} /></div></div></div>)}
      <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </div>
  );
};

export default App;
