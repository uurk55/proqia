import { useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    setUploading(true);
    setError(null);
    const storage = getStorage();
    
    // Dosya ismini benzersiz yapalım
    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${path}/${uniqueName}`);

    try {
      // metadata eklemek 412 hatasını bazen çözer (content-type belirterek)
      const metadata = {
        contentType: file.type,
      };

      const snapshot = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err: any) {
      console.error("Upload Error:", err);
      setError(err.message || "Dosya yüklenirken hata oluştu.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error };
};