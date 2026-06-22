import Layout from '@/components/Layout';
import Loader from '@/components/Loader';

export default function StudentLoading() {
  return (
    <Layout title="Loading Student Area">
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader />
      </div>
    </Layout>
  );
}
