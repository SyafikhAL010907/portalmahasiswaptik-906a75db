import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  subject_id: string;
  semester: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  subject_name?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  semester: number;
}

export function useRepositoryData() {
  const { user, profile, isAdminDev, isAdminKelas } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [uploading, setUploading] = useState(false);

  const semesters = Array.from({ length: 7 }, (_, i) => i + 1);

  const fetchSubjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('semester')
      .order('name');
    
    if (error) {
      console.error('Error fetching subjects:', error);
      return;
    }
    setSubjects(data || []);
  }, []);

  const fetchMaterials = useCallback(async (subjectId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Enrich with subject names
      const enrichedData = (data || []).map(material => ({
        ...material,
        subject_name: subjects.find(s => s.id === material.subject_id)?.name
      }));
      
      setMaterials(enrichedData);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Gagal memuat materi');
    } finally {
      setLoading(false);
    }
  }, [subjects]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (subjects.length > 0) {
      fetchMaterials();
    }
  }, [subjects, fetchMaterials]);

  const uploadMaterial = async (
    file: File,
    data: {
      title: string;
      description?: string;
      subject_id: string;
      semester: number;
    }
  ): Promise<Material | null> => {
    if (!user) {
      toast.error('Anda harus login terlebih dahulu');
      return null;
    }

    setUploading(true);
    try {
      // Determine file type
      let fileType = 'document';
      if (file.type.startsWith('video/')) {
        fileType = 'video';
      } else if (file.type.startsWith('image/')) {
        fileType = 'image';
      }

      // For now, since storage bucket might not exist, we'll use a placeholder URL
      // In production, you would upload to Supabase Storage
      const fileUrl = URL.createObjectURL(file);
      
      // Create material record
      const { data: newMaterial, error } = await supabase
        .from('materials')
        .insert({
          title: data.title,
          description: data.description || null,
          file_url: fileUrl, // In production: use actual storage URL
          file_type: fileType,
          file_size: file.size,
          subject_id: data.subject_id,
          semester: data.semester,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Materi berhasil diupload');
      await fetchMaterials();
      return newMaterial;
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Gagal mengupload materi');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const updateMaterial = async (
    id: string,
    data: Partial<Pick<Material, 'title' | 'description'>>
  ) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Materi berhasil diupdate');
      await fetchMaterials();
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('Gagal mengupdate materi');
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Materi berhasil dihapus');
      await fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Gagal menghapus materi');
      throw error;
    }
  };

  const getSubjectsBySemester = (semester: number) => {
    return subjects.filter(s => s.semester === semester);
  };

  const getMaterialsBySubject = (subjectId: string) => {
    return materials.filter(m => m.subject_id === subjectId);
  };

  const canEdit = isAdminDev() || isAdminKelas();

  return {
    loading,
    uploading,
    materials,
    subjects,
    semesters,
    fetchMaterials,
    uploadMaterial,
    updateMaterial,
    deleteMaterial,
    getSubjectsBySemester,
    getMaterialsBySubject,
    canEdit
  };
}
