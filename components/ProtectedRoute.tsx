import {useAuth} from '@/lib/hooks/useAuth';
import {redirect} from 'next/navigation';

export default function ProtectedRoute({children}: { children: React.ReactNode }) {
    const {user, loading} = useAuth();

    if (loading) {
        return (<div>Loading...</div>)
    }

    if (!user) {
        redirect('/login');
    }

    return <>{children}</>;
}