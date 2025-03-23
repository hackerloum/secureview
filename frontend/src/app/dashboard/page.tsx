// ... existing imports ...
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Content } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface UserLimit {
  upload_limit: number;
  current_uploads: number;
}

export default function Dashboard() {
  const [contents, setContents] = useState<Content[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLimit, setUserLimit] = useState<UserLimit | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    fetchContents();
    fetchUserLimit();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
    }
  };

  const fetchUserLimit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user-limits/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch user limit');
      const data = await response.json();
      setUserLimit(data);
    } catch (error) {
      console.error('Error fetching user limit:', error);
      toast.error('Error fetching upload limit');
    }
  };

  // ... existing fetchContents function ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (userLimit && userLimit.current_uploads >= userLimit.upload_limit) {
      toast.error('You have reached your upload limit. Please contact customer support to increase your limit.');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Upload file to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'your_upload_preset');
      formData.append('userId', user.id);

      const uploadResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.secure_url;

      // Create content in Supabase
      const accessCode = generateAccessCode();

      const { error } = await supabase.from('contents').insert([
        {
          title,
          description,
          image_url: imageUrl,
          access_code: accessCode,
          created_by: user.id,
        },
      ]);

      if (error) throw error;

      toast.success('Content uploaded successfully!');
      setTitle('');
      setDescription('');
      setFile(null);
      fetchContents();
      fetchUserLimit(); // Refresh user limit after upload
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload and manage your content here
        </p>
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
              <button
                onClick={() => window.location.href = 'mailto:support@secureview.com?subject=Upload Limit Increase Request'}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Contact Support
              </button>
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

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        {/* ... existing form fields ... */}
      </form>

      {/* ... rest of the component ... */}
    </div>
  );
}
