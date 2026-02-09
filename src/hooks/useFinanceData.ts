import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WeeklyDueWithProfile {
  id: string;
  student_id: string;
  week_number: number;
  year: number;
  status: 'paid' | 'pending' | 'unpaid';
  amount: number;
  proof_url: string | null;
  paid_at: string | null;
  profile: {
    full_name: string;
    nim: string;
    class_id: string;
  } | null;
}

export interface StudentDueRow {
  student_id: string;
  full_name: string;
  nim: string;
  class_id: string;
  dues: Record<number, { id: string; status: 'paid' | 'pending' | 'unpaid' }>;
}

export interface ClassFinanceSummary {
  class_id: string;
  class_name: string;
  total_paid: number;
  total_pending: number;
  total_unpaid: number;
  balance: number;
}

const WEEKLY_AMOUNT = 5000;

export function useFinanceData() {
  const { user, profile, isAdminDev, isAdminKelas, isMahasiswa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weeklyDues, setWeeklyDues] = useState<WeeklyDueWithProfile[]>([]);
  const [studentRows, setStudentRows] = useState<StudentDueRow[]>([]);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassFinanceSummary[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [batchBalance, setBatchBalance] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const fetchClasses = useCallback(async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching classes:', error);
      return;
    }
    
    setClasses(data || []);
    if (data && data.length > 0) {
      // Default to user's class or first class
      if (profile?.class_id) {
        setSelectedClassId(profile.class_id);
      } else {
        setSelectedClassId(data[0].id);
      }
    }
  }, [profile?.class_id]);

  const fetchWeeklyDues = useCallback(async () => {
    setLoading(true);
    try {
      // Get all weekly dues with profile info
      const { data: duesData, error: duesError } = await supabase
        .from('weekly_dues')
        .select(`
          id,
          student_id,
          week_number,
          year,
          status,
          amount,
          proof_url,
          paid_at
        `)
        .order('week_number', { ascending: true });

      if (duesError) throw duesError;

      // Get profiles separately
      const studentIds = [...new Set(duesData?.map(d => d.student_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim, class_id')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Create profile map
      const profileMap = new Map(
        profilesData?.map(p => [p.user_id, { full_name: p.full_name, nim: p.nim, class_id: p.class_id }]) || []
      );

      // Merge data
      const mergedDues: WeeklyDueWithProfile[] = (duesData || []).map(due => ({
        ...due,
        status: due.status as 'paid' | 'pending' | 'unpaid',
        profile: profileMap.get(due.student_id) || null
      }));

      setWeeklyDues(mergedDues);

      // Calculate weeks
      const uniqueWeeks = [...new Set(mergedDues.map(d => d.week_number))].sort((a, b) => a - b);
      setWeeks(uniqueWeeks.length > 0 ? uniqueWeeks : [1, 2, 3, 4]);

      // Group by student
      const studentMap = new Map<string, StudentDueRow>();
      mergedDues.forEach(due => {
        if (!due.profile) return;
        
        if (!studentMap.has(due.student_id)) {
          studentMap.set(due.student_id, {
            student_id: due.student_id,
            full_name: due.profile.full_name,
            nim: due.profile.nim,
            class_id: due.profile.class_id,
            dues: {}
          });
        }
        const student = studentMap.get(due.student_id)!;
        student.dues[due.week_number] = { id: due.id, status: due.status };
      });

      setStudentRows(Array.from(studentMap.values()));

      // Calculate class summaries
      const classTotals = new Map<string, { paid: number; pending: number; unpaid: number }>();
      mergedDues.forEach(due => {
        if (!due.profile?.class_id) return;
        const classId = due.profile.class_id;
        
        if (!classTotals.has(classId)) {
          classTotals.set(classId, { paid: 0, pending: 0, unpaid: 0 });
        }
        const totals = classTotals.get(classId)!;
        if (due.status === 'paid') totals.paid++;
        else if (due.status === 'pending') totals.pending++;
        else totals.unpaid++;
      });

      // Get transactions for expense calculation
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount, type');

      let totalExp = 0;
      transactionsData?.forEach(tx => {
        if (tx.type === 'expense') {
          totalExp += Number(tx.amount);
        }
      });
      setTotalExpense(totalExp);

      // Build summaries
      const summaries: ClassFinanceSummary[] = [];
      let batchTotal = 0;

      classTotals.forEach((totals, classId) => {
        const classInfo = classes.find(c => c.id === classId);
        const balance = totals.paid * WEEKLY_AMOUNT;
        batchTotal += balance;
        
        summaries.push({
          class_id: classId,
          class_name: classInfo?.name || classId,
          total_paid: totals.paid,
          total_pending: totals.pending,
          total_unpaid: totals.unpaid,
          balance
        });
      });

      setClassSummaries(summaries);
      setBatchBalance(batchTotal);

    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast.error('Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  }, [classes]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    if (classes.length > 0) {
      fetchWeeklyDues();
    }
  }, [classes, fetchWeeklyDues]);

  const updateDueStatus = useCallback(async (
    dueId: string, 
    newStatus: 'paid' | 'pending' | 'unpaid',
    studentClassId: string
  ): Promise<boolean> => {
    // Check permissions
    if (isMahasiswa()) {
      toast.error('Anda tidak memiliki akses untuk mengubah status');
      return false;
    }

    // Admin kelas can only edit their own class
    if (isAdminKelas() && !isAdminDev()) {
      if (studentClassId !== profile?.class_id) {
        toast.error('Anda hanya dapat mengubah data kelas Anda sendiri');
        return false;
      }
    }

    // Optimistic update
    setWeeklyDues(prev => prev.map(due => 
      due.id === dueId ? { ...due, status: newStatus } : due
    ));

    setStudentRows(prev => prev.map(row => {
      const updatedDues = { ...row.dues };
      Object.keys(updatedDues).forEach(week => {
        if (updatedDues[Number(week)].id === dueId) {
          updatedDues[Number(week)] = { ...updatedDues[Number(week)], status: newStatus };
        }
      });
      return { ...row, dues: updatedDues };
    }));

    try {
      const updateData: { status: string; paid_at?: string | null } = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else {
        updateData.paid_at = null;
      }

      const { error } = await supabase
        .from('weekly_dues')
        .update(updateData)
        .eq('id', dueId);

      if (error) throw error;

      toast.success('Status berhasil diperbarui');
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal memperbarui status');
      // Revert on error
      fetchWeeklyDues();
      return false;
    }
  }, [isMahasiswa, isAdminKelas, isAdminDev, profile?.class_id, fetchWeeklyDues]);

  const canEditClass = useCallback((classId: string): boolean => {
    if (isAdminDev()) return true;
    if (isAdminKelas() && profile?.class_id === classId) return true;
    return false;
  }, [isAdminDev, isAdminKelas, profile?.class_id]);

  const filteredStudentRows = studentRows.filter(
    row => !selectedClassId || row.class_id === selectedClassId
  );

  return {
    loading,
    weeks,
    studentRows: filteredStudentRows,
    allStudentRows: studentRows,
    classSummaries,
    classes,
    selectedClassId,
    setSelectedClassId,
    batchBalance,
    totalExpense,
    updateDueStatus,
    canEditClass,
    refetch: fetchWeeklyDues,
    WEEKLY_AMOUNT
  };
}
