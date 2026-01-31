import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl h-full max-h-[90vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="absolute top-0 right-0 z-10 flex space-x-2 p-4">
          <a 
            href={imageUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors"
            title="Mở trong tab mới"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={20} />
          </a>
          <button 
            onClick={onClose}
            className="p-2 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image Container */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
          <img 
            src={imageUrl} 
            alt="Minh chứng" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null; 
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Lỗi+tải+ảnh";
            }}
          />
        </div>
        
        <div className="mt-2 text-white/70 text-sm">
          Bấm ra ngoài hoặc nút X để đóng
        </div>
      </div>
    </div>
  );
};
