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
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

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

// Type definitions
interface ViewCount {
  created_at: string;
  contents: {
    title: string;
  }[];
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

interface UserLimit {
  upload_limit: number;
  current_uploads: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<'initial' | 'uploading' | 'deleting'>('initial');
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
  const [userLimit, setUserLimit] = useState<UserLimit | null>(null);

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

        // Fetch dashboard data
        await Promise.all([
          fetchContents(session.user.id),
          fetchAnalytics(session.user.id),
          fetchActivities(session.user.id)
        ]);

        // Set default user limit
        setUserLimit({
          upload_limit: 5,
          current_uploads: 0
        });
      } catch (error) {
        console.error('Dashboard setup error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    setupDashboard();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        router.push('/');
      } else if (session) {
        setUser(session.user);
        // Use .then() instead of await since we're not in an async function
        Promise.all([
          fetchContents(session.user.id),
          fetchAnalytics(session.user.id),
          fetchActivities(session.user.id)
        ]).then(() => {
          // Update user limit after content is fetched
          setUserLimit({
            upload_limit: 5,
            current_uploads: contents.length
          });
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const fetchAnalytics = async (userId: string) => {
    try {
      const { data: viewsData, error: viewsError } = await supabase
        .from('content_views')
        .select(`
          created_at,
          contents (
            title
          )
        `)
        .eq('user_id', userId)
        .gte('created_at', subDays(new Date(), 7).toISOString());

      const { data: contentsData, error: contentsError } = await supabase
        .from('contents')
        .select('*')
        .eq('user_id', userId);

      if (viewsError || contentsError) throw viewsError || contentsError;

      // Process views by date
      const viewsByDate = (viewsData || []).reduce<Record<string, number>>((acc, view: ViewCount) => {
        const date = format(parseISO(view.created_at), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      // Get last 7 days of data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        return {
          date,
          views: viewsByDate[date] || 0
        };
      }).reverse();

      setAnalytics({
        totalViews: viewsData?.length || 0,
        totalContent: contentsData?.length || 0,
        recentViews: last7Days
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
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

    const currentUploads = contents.length;
    if (currentUploads >= 5) {
      toast.error('You have reached your upload limit. Please contact us on WhatsApp at +255772484738 to increase your limit.');
      return;
    }

    setLoading(true);
    setLoadingState('uploading');

    try {
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
      
      // Update user limit based on content count
      setUserLimit({
        upload_limit: 5,
        current_uploads: contents.length + 1
      });
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Upload failed');
    } finally {
      setLoading(false);
      setLoadingState('initial');
    }
  };

  const handleDelete = async (contentId: string) => {
    try {
      setLoading(true);
      setLoadingState('deleting');
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
      setLoadingState('initial');
    }
  };

  const fetchActivities = async (userId: string) => {
    try {
      const { data: viewsData, error: viewsError } = await supabase
        .from('content_views')
        .select(`
          created_at,
          contents (
            title
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (viewsError) throw viewsError;

      const activities: Activity[] = (viewsData || []).map((view: ViewCount) => ({
        id: crypto.randomUUID(),
        action: 'View',
        timestamp: view.created_at,
        details: `Viewed content: ${view.contents[0]?.title || 'Unknown'}`
      }));

      setActivities(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Failed to load activities');
    }
  };

  const handleExport = async () => {
    try {
      const data = contents.map(c => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at,
        views: c.view_count
      }));
      
      // Export as CSV
      const csvContent = "data:text/csv;charset=utf-8," + 
        "ID,Title,Created At,Views\n" +
        data.map(row => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
      console.error('Export error:', error);
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1A2F]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00C6B3] mb-4"></div>
        <p className="text-white text-lg">
          {loadingState === 'initial' && 'Loading your dashboard...'}
          {loadingState === 'uploading' && 'Please wait while we process your upload...'}
          {loadingState === 'deleting' && 'Deleting content...'}
        </p>
        <p className="text-white/60 text-sm mt-2">
          {loadingState === 'initial' && 'Preparing your workspace'}
          {loadingState === 'uploading' && 'This may take a few moments depending on file size'}
          {loadingState === 'deleting' && 'Please wait while we remove the content'}
        </p>
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
                  onClick={handleExport}
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
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
                <svg
                  className="w-8 h-8 text-[#00C6B3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Views</p>
                  <p className="text-2xl font-bold text-[#0A1A2F]">{analytics.totalViews}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <svg
                  className="w-8 h-8 text-[#00C6B3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Content</p>
                  <p className="text-2xl font-bold text-[#0A1A2F]">{analytics.totalContent}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <svg
                  className="w-8 h-8 text-[#00C6B3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
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
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
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
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
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
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContent(content);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-[#00C6B3] bg-opacity-10 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-[#00C6B3]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
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

        {/* Upload Limit Display */}
        {userLimit && (
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Upload Limit</h3>
                <p className="text-sm text-gray-500">
                  {userLimit.current_uploads} / {userLimit.upload_limit} uploads used
                </p>
              </div>
              {userLimit.current_uploads >= userLimit.upload_limit && (
                <a
                  href="http://wa.me/255772484738"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Contact Support
                </a>
              )}
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(userLimit.current_uploads / userLimit.upload_limit) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
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
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[#00C6B3] focus:ring-[#00C6B3]"
                  placeholder="Enter title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-[#00C6B3] focus:ring-[#00C6B3]"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-[#00C6B3] hover:text-[#00C6B3]/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#00C6B3] focus-within:ring-offset-2"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {uploadData.file && (
                  <p className="mt-2 text-sm text-gray-500">
                    Selected file: {uploadData.file.name}
                  </p>
                )}
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
                  disabled={loading}
                  className="px-4 py-2 bg-[#00C6B3] text-white rounded-lg hover:bg-[#00C6B3]/90 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    'Upload'
                  )}
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
