import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  // Helper function to convert Google Drive View URL to Direct Image URL
  const getDisplayUrl = (url: string) => {
    try {
      if (url.includes('drive.google.com')) {
        // Extract ID from: https://drive.google.com/file/d/YOUR_FILE_ID/view...
        const idMatch = url.match(/\/d\/([^/]+)/);
        if (idMatch && idMatch[1]) {
          // Convert to: https://drive.google.com/uc?export=view&id=YOUR_FILE_ID
          return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
        }
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  const displayUrl = getDisplayUrl(imageUrl);

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
            title="Mở link gốc (Download)"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={20} />
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
            src={displayUrl} 
            alt="Minh chứng" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null; 
              // Fallback if direct link fails (e.g. permission issue), shows a placeholder instructions
              (e.target as HTMLImageElement).src = "https://via.placeholder.com/600x400?text=Khong+the+xem+truc+tiep.+Vui+long+bam+nut+Download";
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
