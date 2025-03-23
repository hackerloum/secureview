'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../lib/supabase';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string;
  upload_limit: number;
  current_uploads: number;
  is_admin: boolean;
}

interface Content {
  id: string;
  title: string;
  description: string;
  image_url: string;
  access_code: string;
  created_at: string;
  view_count: number;
  user_id: string;
  user_email: string;
}

interface Analytics {
  totalUsers: number;
  totalContent: number;
  totalViews: number;
  recentViews: { date: string; views: number }[];
  recentUploads: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0,
    totalContent: 0,
    totalViews: 0,
    recentViews: [],
    recentUploads: []
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '1y'>('7d');
  const [loadingState, setLoadingState] = useState<'initial' | 'updating' | 'deleting'>('initial');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    const { data: userData, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error || !userData?.is_admin) {
      router.push('/dashboard');
      return;
    }

    setUser(user);
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadingState('initial');

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch contents with user emails
      const { data: contentsData, error: contentsError } = await supabase
        .from('contents')
        .select(`
          *,
          users:user_id (email)
        `)
        .order('created_at', { ascending: false });

      if (contentsError) throw contentsError;
      setContents(contentsData?.map(content => ({
        ...content,
        user_email: content.users?.email
      })) || []);

      // Fetch analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('content_views')
        .select('created_at')
        .gte('created_at', subDays(new Date(), 7).toISOString());

      if (analyticsError) throw analyticsError;

      // Process analytics data
      const recentViews = processAnalyticsData(analyticsData || []);
      const recentUploads = processUploadData(contentsData || []);

      setAnalytics({
        totalUsers: usersData?.length || 0,
        totalContent: contentsData?.length || 0,
        totalViews: analyticsData?.length || 0,
        recentViews,
        recentUploads
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data: any[]) => {
    const viewsByDate = data.reduce((acc: any, view) => {
      const date = format(new Date(view.created_at), 'MMM dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(viewsByDate).map(([date, views]) => ({
      date,
      views: views as number
    }));
  };

  const processUploadData = (data: any[]) => {
    const uploadsByDate = data.reduce((acc: any, content) => {
      const date = format(new Date(content.created_at), 'MMM dd');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(uploadsByDate).map(([date, count]) => ({
      date,
      count: count as number
    }));
  };

  const handleUpdateUserLimit = async (userId: string, newLimit: number) => {
    try {
      setLoading(true);
      setLoadingState('updating');

      const { error } = await supabase
        .from('user_limits')
        .update({ upload_limit: newLimit })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchData();
      toast.success('User limit updated successfully');
      setShowUserModal(false);
    } catch (error) {
      console.error('Error updating user limit:', error);
      toast.error('Failed to update user limit');
    } finally {
      setLoading(false);
      setLoadingState('initial');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setLoadingState('deleting');

      // Delete user's content first
      const { error: contentError } = await supabase
        .from('contents')
        .delete()
        .eq('user_id', userId);

      if (contentError) throw contentError;

      // Delete user's limits
      const { error: limitError } = await supabase
        .from('user_limits')
        .delete()
        .eq('user_id', userId);

      if (limitError) throw limitError;

      // Delete user
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) throw userError;

      await fetchData();
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
      setLoadingState('initial');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContents = contents.filter(content =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    content.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1A2F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3] mb-4"></div>
        <p className="text-white text-lg">
          {loadingState === 'initial' && 'Loading admin dashboard...'}
          {loadingState === 'updating' && 'Updating user settings...'}
          {loadingState === 'deleting' && 'Deleting user...'}
        </p>
        <p className="text-white/60 text-sm mt-2">
          {loadingState === 'initial' && 'Preparing your workspace'}
          {loadingState === 'updating' && 'Please wait while we save changes'}
          {loadingState === 'deleting' && 'Please wait while we remove the user'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-[#00C6B3]">{analytics.totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Content</h3>
            <p className="mt-2 text-3xl font-bold text-[#00C6B3]">{analytics.totalContent}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Views</h3>
            <p className="mt-2 text-3xl font-bold text-[#00C6B3]">{analytics.totalViews}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Views</h3>
            <Line
              data={{
                labels: analytics.recentViews.map(item => item.date),
                datasets: [
                  {
                    label: 'Views',
                    data: analytics.recentViews.map(item => item.views),
                    borderColor: '#00C6B3',
                    tension: 0.1,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
              }}
            />
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Uploads</h3>
            <Bar
              data={{
                labels: analytics.recentUploads.map(item => item.date),
                datasets: [
                  {
                    label: 'Uploads',
                    data: analytics.recentUploads.map(item => item.count),
                    backgroundColor: '#00C6B3',
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Users</h2>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00C6B3] focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Uploads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(user.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.upload_limit}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.current_uploads}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-[#00C6B3] hover:text-[#00C6B3]/80 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Content</h2>
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00C6B3] focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContents.map((content) => (
                  <tr key={content.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{content.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{content.user_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{content.access_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{content.view_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(content.created_at), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* User Edit Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Limit</label>
                <input
                  type="number"
                  min="1"
                  value={selectedUser.upload_limit}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    upload_limit: parseInt(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#00C6B3] focus:ring-[#00C6B3]"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateUserLimit(selectedUser.id, selectedUser.upload_limit)}
                  disabled={loading}
                  className="px-4 py-2 bg-[#00C6B3] text-white rounded-md hover:bg-[#00C6B3]/90 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
