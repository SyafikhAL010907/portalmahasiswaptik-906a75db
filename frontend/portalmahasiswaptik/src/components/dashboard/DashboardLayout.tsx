import { Outlet } from 'react-router-dom';
import { RoleBasedSidebar } from './RoleBasedSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export function DashboardLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex">
        <RoleBasedSidebar />
        <main className="flex-1 md:ml-72 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}
