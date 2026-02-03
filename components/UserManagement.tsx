
import React, { useState } from 'react';
import { User, Role } from '../types';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-800">Quản lý tài khoản</h3>
        <button onClick={handleCreate} className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 hover:bg-blue-600"><Plus size={16} /> <span>Thêm mới</span></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3">Username</th>
              <th className="px-6 py-3">Họ tên</th>
              <th className="px-6 py-3">Vai trò</th>
              <th className="px-6 py-3">Lớp/Thông tin</th>
              <th className="px-6 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{u.username}</td>
                <td className="px-6 py-4">{u.fullname}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase
                    ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                      u.role === Role.GVCN ? 'bg-orange-100 text-orange-700' :
                      u.role === Role.USER ? 'bg-blue-100 text-blue-700' :
                      u.role === Role.HS ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">{u.class}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(u)} className="text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-400"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold">{editingUser.id ? 'Sửa thông tin' : 'Thêm tài khoản'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div><label className="block text-xs font-bold text-gray-400 uppercase">Username *</label><input type="text" required disabled={!!editingUser.id} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary disabled:bg-gray-50" value={editingUser.username || ''} onChange={e => setEditingUser(prev => ({...prev, username: e.target.value}))}/></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase">Mật khẩu {editingUser.id && '(Để trống nếu không đổi)'}</label><input type="password" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={password} onChange={e => setPassword(e.target.value)} placeholder="******"/></div>
              <div><label className="block text-xs font-bold text-gray-400 uppercase">Họ và tên *</label><input type="text" required className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingUser.fullname || ''} onChange={e => setEditingUser(prev => ({...prev, fullname: e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-gray-400 uppercase">Vai trò</label><select className="w-full border rounded-lg px-3 py-2 outline-none" value={editingUser.role || Role.HS} onChange={e => setEditingUser(prev => ({...prev, role: e.target.value as Role}))}>{Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-400 uppercase">Lớp / Mô tả</label><input type="text" className="w-full border rounded-lg px-3 py-2 outline-none" value={editingUser.class || ''} onChange={e => setEditingUser(prev => ({...prev, class: e.target.value}))}/></div>
              </div>
              <div className="pt-3"><button type="submit" disabled={loading} className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50">{loading ? 'Đang xử lý...' : 'Lưu dữ liệu'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
