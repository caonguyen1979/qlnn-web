
import React, { useState } from 'react';
import { User, Role } from '../types';
import { Edit2, Trash2, Plus, X, Users, Lock } from 'lucide-react';
import { gasService } from '../services/gasService';

interface UserManagementProps {
  users: User[];
  onRefresh: () => void;
  classes: string[]; 
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, onRefresh, classes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState(''); 

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setPassword(''); 
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingUser({ username: '', fullname: '', email: '', role: Role.HS, class: '' });
    setPassword('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thành viên này?')) return;
    try {
      setLoading(true);
      await gasService.deleteUser(id);
      onRefresh();
    } catch (e: any) { alert('Xóa thất bại'); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...editingUser };
      if (password) payload.password = password;
      if (editingUser.id) await gasService.updateUser(editingUser.id, payload);
      else await gasService.createUser(payload);
      setIsModalOpen(false);
      onRefresh();
    } catch (e: any) { alert('Lưu thất bại'); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="font-black text-gray-800 flex items-center"><Users size={20} className="mr-2 text-primary" /> Quản lý người dùng</h3>
        <button onClick={handleCreate} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center space-x-1 hover:bg-blue-600 shadow-lg shadow-primary/20"><Plus size={18} /> <span>THÊM MỚI</span></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50/50 tracking-widest">
            <tr>
              <th className="px-6 py-4">Tài khoản</th>
              <th className="px-6 py-4">Họ và tên</th>
              <th className="px-6 py-4">Vai trò</th>
              <th className="px-6 py-4">Lớp / Mô tả</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-black text-gray-800">{u.username}</td>
                <td className="px-6 py-4 font-bold">{u.fullname}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-tighter
                    ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                      u.role === Role.GVCN ? 'bg-orange-100 text-orange-700' :
                      u.role === Role.USER ? 'bg-blue-100 text-blue-700' :
                      u.role === Role.HS ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">{u.class || '-'}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50"><h3 className="font-black text-gray-800">{editingUser.id ? 'SỬA THÀNH VIÊN' : 'THÊM THÀNH VIÊN'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Tên đăng nhập *</label><input type="text" required disabled={!!editingUser.id} className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-primary disabled:bg-gray-50 font-bold" value={editingUser.username || ''} onChange={e => setEditingUser(prev => ({...prev, username: e.target.value}))}/></div>
              <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Mật khẩu {editingUser.id && '(Bỏ trống nếu không đổi)'}</label><div className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input type="password" className="w-full border-2 border-gray-100 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary font-bold" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/></div></div>
              <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Họ và tên *</label><input type="text" required className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-primary font-bold" value={editingUser.fullname || ''} onChange={e => setEditingUser(prev => ({...prev, fullname: e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Vai trò</label><select className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-primary font-bold" value={editingUser.role || Role.HS} onChange={e => setEditingUser(prev => ({...prev, role: e.target.value as Role}))}>{Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-xs font-black text-gray-400 uppercase mb-2">Lớp / Mô tả</label><input type="text" className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-primary font-bold" value={editingUser.class || ''} onChange={e => setEditingUser(prev => ({...prev, class: e.target.value}))}/></div>
              </div>
              <div className="pt-6"><button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-xl font-black hover:bg-blue-600 disabled:opacity-50 shadow-xl shadow-primary/20">LƯU TÀI KHOẢN</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
