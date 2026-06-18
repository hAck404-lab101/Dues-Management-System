import AdminLayout from '@/components/AdminLayout';
import { DashboardSkeleton } from '@/components/Skeletons';

export default function AdminLoading() {
  return (
    <AdminLayout title="Loading Admin Area">
      <DashboardSkeleton />
    </AdminLayout>
  );
}
