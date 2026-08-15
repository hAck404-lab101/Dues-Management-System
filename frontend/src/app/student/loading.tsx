import Layout from '@/components/Layout';
import { DashboardSkeleton } from '@/components/Skeletons';

export default function StudentLoading() {
  return (
    <Layout title="Loading Student Area">
      <DashboardSkeleton />
    </Layout>
  );
}
