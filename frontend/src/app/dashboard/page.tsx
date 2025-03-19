'use client';

import { useEffect, useState, useMemo } from 'react';
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
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, subDays, parseISO } from 'date-fns';
import {
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ChartBarIcon,
  EyeIcon,
  KeyIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { saveAs } from 'file-saver';

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

interface Content {
  id: string;
  title: string;
  description: string;
  image_url: string;
  access_code: string;
  created_at: string;
  view_count: number;
  user_id: string;
}

interface Analytics {
  totalViews: number;
  totalContent: number;
  recentViews: { date: string; views: number }[];
}

interface Activity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalViews: 0,
    totalContent: 0,
    recentViews: []
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    file: null as File | null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '1y'>('7d');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contentFilter, setContentFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [newCodeSettings, setNewCodeSettings] = useState({
    expiryDate: null as Date | null,
    usageLimit: 1,
  });

  useEffect(() => {
    const setupDashboard = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          router.push('/');
          return;
        }

        if (!session) {
          router.push('/');
          return;
        }

        setUser(session.user);
        await Promise.all([
          fetchContents(session.user.id),
          fetchAnalytics(session.user.id)
        ]);
      } catch (error) {
        console.error('Dashboard setup error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    setupDashboard();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        await Promise.all([
          fetchContents(session.user.id),
          fetchAnalytics(session.user.id)
        ]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchAnalytics = async (userId: string) => {
    try {
      // Fetch total views and content count
      const { data: viewsData, error: viewsError } = await supabase
        .from('content_views')
        .select('content_id')
        .eq('content_user_id', userId);

      const { data: contentsData, error: contentsError } = await supabase
        .from('contents')
        .select('created_at')
        .eq('user_id', userId);

      if (viewsError || contentsError) throw viewsError || contentsError;

      // Generate recent views data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const recentViews = last7Days.map(date => ({
        date,
        views: Math.floor(Math.random() * 50) // Replace with actual view counts from your database
      }));

      setAnalytics({
        totalViews: viewsData?.length || 0,
        totalContent: contentsData?.length || 0,
        recentViews
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchContents = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .eq('user_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file || !user) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('userId', user.id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      await fetchContents(user.id);
      await fetchAnalytics(user.id);
      setShowUploadModal(false);
      setUploadData({ title: '', description: '', file: null });
    } catch (error) {
      console.error('Error uploading:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('contents')
        .delete()
        .eq('id', contentId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchContents(user.id);
      await fetchAnalytics(user.id);
      setShowDeleteModal(false);
      setSelectedContent(null);
    } catch (error) {
      console.error('Error deleting content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (userId: string) => {
    // In a real app, fetch from your database
    const mockActivities: Activity[] = [
      {
        id: '1',
        action: 'Copied access code',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        details: 'Content: Yoga Corner'
      },
      // Add more mock activities...
    ];
    setActivities(mockActivities);
  };

  const handleExportData = (type: 'csv' | 'pdf') => {
    // Implementation for data export
    const data = contents.map(c => ({
      title: c.title,
      access_code: c.access_code,
      views: c.view_count,
      created_at: c.created_at
    }));

    if (type === 'csv') {
      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, 'secureview_data.csv');
    }
  };

  const convertToCSV = (data: any[]) => {
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(','));
    return [header, ...rows].join('\n');
  };

  const generateAccessCode = async () => {
    // Implementation for access code generation
    // This would typically call your backend API
  };

  const filteredContents = useMemo(() => {
    return contents.filter(content => {
      if (contentFilter === 'all') return true;
      const isExpired = new Date(content.created_at) < subDays(new Date(), 30); // Example expiry logic
      return contentFilter === 'expired' ? isExpired : !isExpired;
    }).filter(content =>
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.access_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contents, contentFilter, searchTerm]);

  const chartData = {
    labels: analytics.recentViews.map(item => item.date),
    datasets: [
      {
        label: 'Views',
        data: analytics.recentViews.map(item => item.views),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${showSidebar ? 'translate-x-0' : '-translate-x-full'} w-64 bg-[#0A1A2F] transition-transform duration-300 ease-in-out z-30 md:translate-x-0`}>
        {/* Sidebar content */}
      </div>

      {/* Main content */}
      <div className="md:ml-64 min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-[#0A1A2F]">Dashboard</h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleExportData('csv')}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0A1A2F] rounded-md hover:bg-opacity-90"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <EyeIcon className="w-8 h-8 text-[#00C6B3]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Views</p>
                  <p className="text-2xl font-bold text-[#0A1A2F]">{analytics.totalViews}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <ChartBarIcon className="w-8 h-8 text-[#00C6B3]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Content</p>
                  <p className="text-2xl font-bold text-[#0A1A2F]">{analytics.totalContent}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <KeyIcon className="w-8 h-8 text-[#00C6B3]" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Access Codes</p>
                  <p className="text-2xl font-bold text-[#0A1A2F]">{contents.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Views Over Time */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-[#0A1A2F]">Views Over Time</h2>
                <div className="flex space-x-2">
                  {['7d', '30d', '1y'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range as '7d' | '30d' | '1y')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        dateRange === range
                          ? 'bg-[#00C6B3] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <Line data={chartData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Content Performance */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-[#0A1A2F] mb-6">Content Performance</h2>
              <div className="h-64">
                <Bar
                  data={{
                    labels: contents.map(c => c.title),
                    datasets: [{
                      label: 'Views',
                      data: contents.map(c => c.view_count),
                      backgroundColor: '#00C6B3',
                    }]
                  }}
                  options={{ maintainAspectRatio: false }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Management */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-lg font-semibold text-[#0A1A2F]">Content Management</h2>
                <div className="flex space-x-4">
                  <select
                    value={contentFilter}
                    onChange={(e) => setContentFilter(e.target.value as 'all' | 'active' | 'expired')}
                    className="rounded-md border-gray-300 text-sm"
                  >
                    <option value="all">All Content</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                  </select>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#00C6B3] rounded-md hover:bg-opacity-90"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    New Content
                  </button>
                </div>
              </div>
            </div>

            {/* Content Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Access Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContents.map((content) => (
                    <tr key={content.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={content.image_url}
                              alt=""
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{content.title}</div>
                            <div className="text-sm text-gray-500">{format(parseISO(content.created_at), 'MMM d, yyyy')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900">{content.access_code}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(content.access_code)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm text-gray-900">{content.view_count}</span>
                          <span className="ml-2 h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          new Date(content.created_at) > subDays(new Date(), 30)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {new Date(content.created_at) > subDays(new Date(), 30) ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {/* Handle edit */}}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContent(content);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#0A1A2F]">Recent Activity</h2>
              <button className="text-[#00C6B3] hover:text-opacity-80">
                <BellIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-[#00C6B3] bg-opacity-10 flex items-center justify-center">
                      <KeyIcon className="w-4 h-4 text-[#00C6B3]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(activity.timestamp), 'h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Upload New Content</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Delete Content</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{selectedContent.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedContent(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedContent.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
