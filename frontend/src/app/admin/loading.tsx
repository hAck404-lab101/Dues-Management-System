import AdminLayout from '@/components/AdminLayout';
import Loader from '@/components/Loader';

export default function AdminLoading() {
  return (
    <AdminLayout title="Loading Admin Area">
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    </AdminLayout>
  );
}
