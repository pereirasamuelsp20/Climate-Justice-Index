import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../store/useUserStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Optimal size for avatars
        const scaleSize = MAX_WIDTH / img.width;
        
        let width = img.width;
        let height = img.height;
        
        if (scaleSize < 1) {
          width = MAX_WIDTH;
          height = img.height * scaleSize;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original if compression fails
            }
          },
          'image/jpeg',
          0.7 // 70% quality for fast uploads
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const session = useUserStore((state) => state.session);
  const user = session?.user;
  const metadata = user?.user_metadata || {};

  const [name, setName] = useState(metadata.name || metadata.full_name || '');
  const [country, setCountry] = useState(metadata.country || '');
  const [region, setRegion] = useState(metadata.region || '');
  const [avatarUrl, setAvatarUrl] = useState<string>(metadata.avatar_url || '');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = name?.[0] || user?.email?.[0] || 'U';

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile || !user) return;

    // Immediately show local preview for a snappy UX
    const localPreviewUrl = URL.createObjectURL(rawFile);
    setAvatarUrl(localPreviewUrl);

    try {
      setIsUploading(true);
      
      // Compress the image to ~400px width / 70% JPEG quality
      const file = await compressImage(rawFile);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // Update with the permanent public URL
      setAvatarUrl(data.publicUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar!');
      // Revert if upload fails
      setAvatarUrl(metadata.avatar_url || '');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          name,
          country,
          region,
          avatar_url: avatarUrl,
        }
      });

      if (error) throw error;
      
      // We don't need to manually update state if Supabase triggers an onAuthStateChange, 
      // but to be safe and snappy we could just close the modal.
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error saving profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#161923] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
          <DialogDescription className="text-slate-400">
            Manage your personal settings and how others see you on the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="h-24 w-24 border-2 border-white/10 group-hover:border-blue-500/50 transition-colors">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-[#1a1d2e] text-slate-300 text-2xl font-medium">
                  {initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <span className="text-xs text-slate-500">Click avatar to change</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Your full name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address <span className="text-xs text-slate-500 ml-2">(Read Only)</span></label>
              <input 
                type="email" 
                value={user?.email || ''} 
                readOnly
                disabled
                className="w-full bg-[#1a1d2e]/50 border border-white/5 rounded-lg px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Country</label>
                <input 
                  type="text" 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="e.g. Norway"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Region</label>
                <input 
                  type="text" 
                  value={region} 
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="e.g. Europe"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 data-disabled:opacity-50 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving || isUploading}
          >
            {isSaving || isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isUploading ? 'Uploading Image...' : isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
