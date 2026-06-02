import Layout from '@/components/Layout';
import { DashboardSkeleton } from '@/components/Skeletons';

export default function AdminLoading() {
  return (
    <Layout title="Loading Admin Area">
      <DashboardSkeleton />
    </Layout>
  );
}
