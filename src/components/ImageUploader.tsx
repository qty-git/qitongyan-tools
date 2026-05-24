import React from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploaderProps {
  image: string | null;
  imageInputRef: React.RefObject<HTMLInputElement>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImageUploader({ image, imageInputRef, handleImageUpload }: ImageUploaderProps) {
  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ImageIcon size={20} className="text-gray-400" />
        1. 上传衣服图片
      </h2>
      
      <div 
        onClick={() => imageInputRef.current?.click()}
        className={cn(
          "relative aspect-square sm:aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group",
          image ? "border-transparent" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50/50"
        )}
      >
        {image ? (
          <>
            <img src={image} alt="Preview" className="w-full h-full object-contain bg-gray-50" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <div className="bg-white/20 p-3 rounded-full border border-white/30">
                <Upload className="text-white" size={20} />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Upload className="text-blue-600" size={20} />
            </div>
            <p className="text-xs font-bold text-gray-700">点击或粘贴上传</p>
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />
    </section>
  );
}
