import AuthProvider from '@/components/auth-provider';
import Dashboard from '@/components/dashboard';

export default function Home() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
