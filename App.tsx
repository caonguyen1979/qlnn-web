
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
  Mail,
  Lock,
  User as UserIcon,
  ArrowLeft,
  ShieldAlert,
  Calendar,
  Eye, 
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  FileDown,
  Columns,
  Smartphone
} from 'lucide-react';

const SESSION_KEY = 'eduleave_session';

type AuthMode = 'login' | 'register' | 'forgot';

const AVAILABLE_COLUMNS = [
  { key: 'week', label: 'Tuần' },
  { key: 'studentName', label: 'Họ và tên' },
  { key: 'class', label: 'Lớp' },
  { key: 'date', label: 'Ngày nghỉ' }, 
  { key: 'reason', label: 'Lý do' },
  { key: 'detail', label: 'Chi tiết' },
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
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [regFullname, setRegFullname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regUserType, setRegUserType] = useState<Role.HS | Role.GVCN | Role.VIEWER>(Role.HS);
  const [regClassInfo, setRegClassInfo] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

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
          try {
             const result = await gasService.loadAllConfigData();
             setData(result.requests);
             setAllUsers(result.users);
             if (result.config) {
               setSystemConfig(prev => ({ ...prev, ...result.config }));
               if (result.config.currentWeek) { setSelectedDashboardWeek(Number(result.config.currentWeek)); }
             }
          } catch (err) { console.warn("Failed to load initial data", err); }
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

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterClass, filterStatus, filterWeek]);

  const loadData = async () => {
    const result = await gasService.loadAllConfigData();
    setData(result.requests);
    setAllUsers(result.users);
    if (result.config) {
      setSystemConfig(prev => ({ ...prev, ...result.config }));
      if (result.config.currentWeek) { setSelectedDashboardWeek(Number(result.config.currentWeek)); }
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

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
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
    try {
      const res = await gasService.register({
        username: regUsername, password: regPassword, fullname: regFullname, email: regEmail, class: regClassInfo, role: regUserType
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
      studentName: user.role === Role.HS ? user.fullname : (formData.studentName || 'Unknown'),
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

  const totalPages = Math.ceil(filteredData.length / pageSize);
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
    
    // For ADMIN, USER, GVCN
    return baseConfig.filter(c => c.key !== 'status' || PERMISSIONS[user?.role || Role.VIEWER].canApprove);
  }, [systemConfig, user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="flex w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px]">
          <div className="hidden md:flex md:w-1/2 bg-primary p-12 flex-col justify-center text-white relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-4">{systemConfig.schoolName}</h1>
              <p className="text-lg opacity-90">Hệ thống quản lý nghỉ phép thông minh.</p>
            </div>
          </div>
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <div className="flex justify-center mb-6"><img src="./logo.png" alt="Logo" className="w-24 h-24 object-contain" /></div>
            <div className="text-center md:text-left mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{authMode === 'login' ? 'Đăng nhập' : authMode === 'register' ? 'Đăng ký' : 'Quên mật khẩu?'}</h2>
              <p className="text-gray-500">{authMode === 'login' ? 'Chào mừng trở lại!' : authMode === 'register' ? 'Tạo tài khoản mới' : 'Nhập email để lấy lại mật khẩu'}</p>
            </div>
            {authError && <div className="mb-4 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{authError}</div>}
            {authSuccess && <div className="mb-4 text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100">{authSuccess}</div>}
            
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label><div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" required className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-primary" value={username} onChange={(e) => setUsername(e.target.value)} /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="password" required className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-primary" value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="text-right mt-1"><button type="button" onClick={() => setAuthMode('forgot')} className="text-xs text-primary hover:underline">Quên mật khẩu?</button></div></div>
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors">{authLoading ? 'Đang xử lý...' : 'Đăng nhập'}</button>
                <div className="text-center text-sm text-gray-500 mt-4">Chưa có tài khoản? <button type="button" onClick={() => setAuthMode('register')} className="text-primary font-semibold hover:underline">Đăng ký ngay</button></div>
              </form>
            )}
            {authMode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label><input type="text" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none" value={regFullname} onChange={e => setRegFullname(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none" value={regEmail} onChange={e => setRegEmail(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label><input type="text" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none" value={regUsername} onChange={e => setRegUsername(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label><input type="password" required className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none" value={regPassword} onChange={e => setRegPassword(e.target.value)} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Bạn là?</label>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => setRegUserType(Role.HS)} className={`flex-1 py-2 rounded-lg border text-xs font-medium ${regUserType === Role.HS ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600'}`}>Học sinh</button>
                    <button type="button" onClick={() => setRegUserType(Role.GVCN)} className={`flex-1 py-2 rounded-lg border text-xs font-medium ${regUserType === Role.GVCN ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600'}`}>GVCN</button>
                    <button type="button" onClick={() => setRegUserType(Role.VIEWER)} className={`flex-1 py-2 rounded-lg border text-xs font-medium ${regUserType === Role.VIEWER ? 'bg-blue-50 border-primary text-primary' : 'bg-white border-gray-200 text-gray-600'}`}>Khác</button>
                  </div>
                </div>
                {regUserType === Role.HS ? (<div><label className="block text-sm font-medium text-gray-700 mb-1">Lớp</label><select className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none" value={regClassInfo} onChange={(e) => setRegClassInfo(e.target.value)} required><option value="">-- Chọn lớp --</option>{systemConfig.classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>) : (<div><label className="block text-sm font-medium text-gray-700 mb-1">Thông tin thêm</label><input type="text" className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 outline-none" value={regClassInfo} onChange={e => setRegClassInfo(e.target.value)} /></div>)}
                <button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors mt-2">{authLoading ? 'Đang đăng ký...' : 'Đăng ký'}</button>
                <div className="text-center text-sm mt-4"><button type="button" onClick={() => setAuthMode('login')} className="text-gray-500 hover:text-gray-800">Quay lại đăng nhập</button></div>
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
      <aside className={`hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-20 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-64'}`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 min-w-[16rem]"><img src="./logo.png" alt="Logo" className="w-10 h-10 object-contain mr-3" /><span className="text-xl font-bold text-gray-800 truncate">{systemConfig.schoolName}</span></div>
        <nav className="flex-1 p-4 space-y-1 min-w-[16rem]">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutDashboard size={20} /><span>Tổng quan</span></button>
          <button onClick={() => setActiveTab('requests')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'requests' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><FileText size={20} /><span>Đơn xin phép</span></button>
          {user.role === Role.ADMIN && (<button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={20} /><span>Cài đặt hệ thống</span></button>)}
        </nav>
        <div className="p-4 border-t border-gray-100 min-w-[16rem]"><div className="flex items-center space-x-3 mb-4 px-2"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold uppercase shrink-0">{user.fullname ? user.fullname.charAt(0) : 'U'}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{user.fullname}</p><p className="text-xs text-gray-500 truncate">{user.class || user.role}</p></div></div><button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"><LogOut size={16} /><span>Đăng xuất</span></button></div>
      </aside>

      {sidebarOpen && (<div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>)}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white z-40 transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="p-4 flex items-center border-b space-x-2"><img src="./logo.png" alt="Logo" className="w-8 h-8 object-contain" /><span className="font-bold text-xl flex-1 truncate">{systemConfig.schoolName}</span><button onClick={() => setSidebarOpen(false)}><X size={24} /></button></div>
         <nav className="p-4 space-y-2">
            <button onClick={() => {setActiveTab('dashboard'); setSidebarOpen(false)}} className={`w-full flex items-center space-x-3 p-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-blue-50 text-primary' : ''}`}><LayoutDashboard size={20}/> <span>Tổng quan</span></button>
            <button onClick={() => {setActiveTab('requests'); setSidebarOpen(false)}} className={`w-full flex items-center space-x-3 p-3 rounded-lg ${activeTab === 'requests' ? 'bg-blue-50 text-primary' : ''}`}><FileText size={20}/> <span>Đơn xin phép</span></button>
            {user.role === Role.ADMIN && (<button onClick={() => {setActiveTab('settings'); setSidebarOpen(false)}} className={`w-full flex items-center space-x-3 p-3 rounded-lg ${activeTab === 'settings' ? 'bg-blue-50 text-primary' : ''}`}><Settings size={20}/> <span>Cài đặt hệ thống</span></button>)}
            <hr className="my-2 border-gray-100" />
            <button onClick={handleLogout} className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-500 hover:bg-red-50"><LogOut size={20}/> <span>Đăng xuất</span></button>
         </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 no-print">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 mr-2"><Menu size={24} /></button>
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="hidden md:flex text-gray-600 mr-4 hover:bg-gray-100 p-2 rounded-lg transition-colors"><Menu size={24} /></button>
            <h2 className="text-lg font-semibold text-gray-800">{activeTab === 'dashboard' ? 'Tổng quan' : activeTab === 'requests' ? 'Quản lý đơn' : 'Cài đặt'}</h2>
          </div>
          <div className="flex items-center space-x-4">
             <span className={`px-3 py-1 rounded-full text-xs font-semibold 
               ${user.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' : 
                 user.role === Role.GVCN ? 'bg-orange-100 text-orange-700' : 
                 'bg-blue-100 text-blue-700'}`}>
               {user.role}
             </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 main-content">
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto">
              {/* Dashboard sections... */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 no-print">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-xs text-gray-500 mb-1">Tổng đơn (T{selectedDashboardWeek})</p><p className="text-xl font-bold text-gray-800">{data.filter(r => Number(r.week) === selectedDashboardWeek).length}</p></div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-xs text-gray-500 mb-1">Chờ duyệt</p><p className="text-xl font-bold text-yellow-600">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.PENDING).length}</p></div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-xs text-gray-500 mb-1">Đã duyệt</p><p className="text-xl font-bold text-green-600">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.APPROVED).length}</p></div>
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"><p className="text-xs text-gray-500 mb-1">Từ chối</p><p className="text-xl font-bold text-red-600">{data.filter(i => Number(i.week) === selectedDashboardWeek && i.status === Status.REJECTED).length}</p></div>
              </div>
              <DashboardChart allData={data} systemConfig={systemConfig} selectedWeek={selectedDashboardWeek} />
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="max-w-6xl mx-auto h-full flex flex-col">
              {/* Toolbar and list... */}
              <div className="bg-white p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                   <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Tìm tên, ID..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-primary outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                   <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none" value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}><option value="">Mọi tuần</option>{availableWeeks.map(w => <option key={w} value={w}>Tuần {w}</option>)}</select>
                   <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}><option value="">Mọi lớp</option>{systemConfig.classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
                   <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="">Mọi trạng thái</option>{Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
                {canCreate && (<button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 shadow-sm"><Plus size={18} /><span>Tạo đơn</span></button>)}
              </div>

              <div className="bg-white border-x border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="hidden md:block flex-1 overflow-auto">
                  <table className="w-full text-sm text-left text-gray-500 relative">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0 z-10">
                      <tr>
                        {visibleColumns.includes('week') && <th className="px-6 py-3 bg-gray-50">Tuần</th>}
                        {visibleColumns.includes('studentName') && <th className="px-6 py-3 bg-gray-50">Học sinh</th>}
                        {visibleColumns.includes('class') && <th className="px-6 py-3 bg-gray-50">Lớp</th>}
                        {visibleColumns.includes('date') && <th className="px-6 py-3 bg-gray-50">Ngày nghỉ</th>}
                        {visibleColumns.includes('reason') && <th className="px-6 py-3 bg-gray-50">Lý do</th>}
                        {visibleColumns.includes('attachment') && <th className="px-6 py-3 text-center bg-gray-50">Minh chứng</th>}
                        {visibleColumns.includes('status') && <th className="px-6 py-3 bg-gray-50">Trạng thái</th>}
                        {visibleColumns.includes('approver') && <th className="px-6 py-3 bg-gray-50">Người duyệt</th>}
                        {(canApprove || canDelete) && <th className="px-6 py-3 text-center bg-gray-50 no-print">Hành động</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.length === 0 ? (<tr><td colSpan={10} className="px-6 py-8 text-center text-gray-400">Không có dữ liệu</td></tr>) : (
                        paginatedData.map((item) => (
                          <tr key={item.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                            {visibleColumns.includes('week') && <td className="px-6 py-4 text-center font-bold text-gray-400">{item.week}</td>}
                            {visibleColumns.includes('studentName') && <td className="px-6 py-4 font-medium text-gray-900">{item.studentName}</td>}
                            {visibleColumns.includes('class') && <td className="px-6 py-4">{item.class}</td>}
                            {visibleColumns.includes('date') && <td className="px-6 py-4 whitespace-nowrap">{formatDateDisplay(item.fromDate)} {item.fromDate !== item.toDate && ` - ${formatDateDisplay(item.toDate)}`}</td>}
                            {visibleColumns.includes('reason') && <td className="px-6 py-4 truncate max-w-[120px]">{item.reason}</td>}
                            {visibleColumns.includes('attachment') && (<td className="px-6 py-4 text-center">{item.attachmentUrl ? (<button onClick={() => setPreviewImageUrl(item.attachmentUrl || '')} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full no-print"><Eye size={18} /></button>) : (<span className="text-gray-300">-</span>)}</td>)}
                            {visibleColumns.includes('status') && (<td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === Status.APPROVED ? 'bg-green-100 text-green-700' : item.status === Status.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span></td>)}
                            {visibleColumns.includes('approver') && <td className="px-6 py-4 text-xs italic text-gray-500">{item.approver || '-'}</td>}
                            <td className="px-6 py-4 text-center no-print">
                                <div className="flex items-center justify-center space-x-2">
                                  {canApprove && item.status === Status.PENDING && (
                                    <><button onClick={() => handleStatusChange(item.id, Status.APPROVED)} className="text-green-600 p-1"><CheckCircle size={18} /></button><button onClick={() => handleStatusChange(item.id, Status.REJECTED)} className="text-red-600 p-1"><XCircle size={18} /></button></>
                                  )}
                                  {canDelete && (<button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={18} /></button>)}
                                  {(user.username === item.createdBy || user.role === Role.ADMIN) && item.status === Status.PENDING && (<button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-blue-500 p-1"><Edit2 size={18} /></button>)}
                                </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card */}
                <div className="md:hidden flex-1 overflow-auto bg-gray-50 p-2 space-y-3 no-print">
                   {paginatedData.map(item => (
                      <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 relative">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === Status.APPROVED ? 'bg-green-500' : item.status === Status.REJECTED ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <div className="flex justify-between mb-2">
                           <span className="text-xs font-bold text-gray-400">Tuần {item.week}</span>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.status === Status.APPROVED ? 'bg-green-100 text-green-700' : item.status === Status.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.status}</span>
                        </div>
                        <h4 className="font-bold text-gray-800">{item.studentName} - {item.class}</h4>
                        <p className="text-sm text-gray-500 mb-2 truncate">{item.reason}</p>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                           <div className="flex space-x-2">
                             {item.attachmentUrl && (<button onClick={() => setPreviewImageUrl(item.attachmentUrl || '')} className="text-blue-500"><Eye size={16}/></button>)}
                           </div>
                           <div className="flex space-x-2">
                             {canApprove && item.status === Status.PENDING && (<><button onClick={() => handleStatusChange(item.id, Status.APPROVED)} className="text-green-600"><CheckCircle size={18}/></button><button onClick={() => handleStatusChange(item.id, Status.REJECTED)} className="text-red-600"><XCircle size={18}/></button></>)}
                             {(user.username === item.createdBy || user.role === Role.ADMIN) && item.status === Status.PENDING && (<button onClick={() => {setEditingItem(item); setIsModalOpen(true);}} className="text-blue-500"><Edit2 size={18}/></button>)}
                           </div>
                        </div>
                      </div>
                   ))}
                </div>
              </div>

              {/* Pagination controls... */}
            </div>
          )}

          {activeTab === 'settings' && user.role === Role.ADMIN && (<div className="max-w-4xl mx-auto space-y-8"><UserManagement users={allUsers} onRefresh={loadData} classes={systemConfig.classes} /><SystemSettings config={systemConfig} onRefresh={loadData} /></div>)}
        </div>
      </main>

      {isModalOpen && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"><div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="text-lg font-bold text-gray-800">{editingItem ? 'Sửa đơn' : 'Tạo đơn mới'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div><div className="p-6 overflow-y-auto"><DynamicForm config={formConfig} initialData={editingItem || { week: systemConfig.currentWeek }} onSubmit={editingItem ? handleUpdate : handleCreate} onCancel={() => setIsModalOpen(false)} isSubmitting={isSubmitting} /></div></div></div>)}
      <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />
    </div>
  );
};

export default App;
