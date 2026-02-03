
import React, { useState } from 'react';
import { ColumnConfig } from '../types';
import { Upload, X, FileCheck } from 'lucide-react';
import { gasService } from '../services/gasService';

interface DynamicFormProps {
  config: ColumnConfig[];
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ config, initialData = {}, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<any>(initialData);
  const [uploading, setUploading] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const url = await gasService.uploadFile(e.target.files[0]);
        handleChange(key, url);
      } catch (error: any) {
        alert(error.message || "Tải lên thất bại");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.filter(c => !c.hidden && c.key !== 'id').map((col) => (
          <div key={col.key} className={col.type === 'textarea' || col.type === 'file' ? "md:col-span-2" : ""}>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              {col.label} {col.required && <span className="text-red-500">*</span>}
            </label>
            
            {col.type === 'select' ? (
              <select
                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData[col.key] || ''}
                onChange={(e) => handleChange(col.key, e.target.value)}
                required={col.required}
              >
                <option value="">-- Chọn {col.label} --</option>
                {col.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : col.type === 'textarea' ? (
              <textarea
                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                rows={3}
                value={formData[col.key] || ''}
                onChange={(e) => handleChange(col.key, e.target.value)}
                required={col.required}
              />
            ) : col.type === 'file' ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className={`cursor-pointer border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center justify-center transition-all w-full
                    ${formData[col.key] ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                    <Upload className={`w-8 h-8 mb-2 ${formData[col.key] ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-600">
                      {uploading ? "Đang tải lên..." : formData[col.key] ? "Đã đính kèm file" : "Chọn ảnh hoặc PDF (Tối đa 4MB)"}
                    </span>
                    <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFileUpload(e, col.key)} disabled={uploading} />
                  </label>
                </div>
                {formData[col.key] && (
                  <div className="flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center text-green-600 text-sm font-bold">
                      <FileCheck size={18} className="mr-2" />
                      <a href={formData[col.key]} target="_blank" rel="noreferrer" className="underline truncate max-w-[200px]">Xem file đã tải</a>
                    </div>
                    <button type="button" onClick={() => handleChange(col.key, '')} className="text-red-500 p-1 hover:bg-red-50 rounded"><X size={18}/></button>
                  </div>
                )}
              </div>
            ) : (
              <input
                type={col.type}
                className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData[col.key] || ''}
                onChange={(e) => handleChange(col.key, e.target.value)}
                required={col.required}
                min={col.min}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-blue-600 disabled:opacity-50 flex items-center shadow-lg shadow-primary/20"
          disabled={isSubmitting || uploading}
        >
          {isSubmitting ? 'Đang lưu...' : 'Lưu dữ liệu'}
        </button>
      </div>
    </form>
  );
};
