import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { subDays } from 'date-fns';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Validate environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(cors());
app.use(express.json());
app.use(limiter);

// Upload content endpoint
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.body.title || !req.body.description || !req.body.userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      });
    }

    // Check user upload limit
    const { data: userLimit, error: limitError } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', req.body.userId)
      .single();

    if (limitError && limitError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking user limit:', limitError);
      return res.status(500).json({ error: 'Error checking upload limit' });
    }

    // If no limit record exists, create one with increased limit
    if (!userLimit) {
      const { error: insertError } = await supabase
        .from('user_limits')
        .insert([{ 
          user_id: req.body.userId,
          upload_limit: 5, // Changed to 5 uploads
          current_uploads: 0
        }]);

      if (insertError) {
        console.error('Error creating user limit:', insertError);
        return res.status(500).json({ error: 'Error setting up user limit' });
      }
    }

    // Check if user has reached their limit
    if (userLimit && userLimit.current_uploads >= userLimit.upload_limit) {
      return res.status(403).json({ 
        error: 'Upload limit reached',
        message: 'You have reached your upload limit. Please contact us on WhatsApp at +255772484738 to increase your limit.',
        current: userLimit.current_uploads,
        limit: userLimit.upload_limit
      });
    }

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'secureview',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file!.buffer);
    });

    const { secure_url } = uploadResponse as any;

    // Generate access code
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Save to Supabase
    const { data, error } = await supabase
      .from('contents')
      .insert([
        {
          title: req.body.title,
          description: req.body.description,
          image_url: secure_url,
          access_code: accessCode,
          user_id: req.body.userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Update user's upload count
    const { error: updateError } = await supabase
      .from('user_limits')
      .update({ current_uploads: (userLimit?.current_uploads || 0) + 1 })
      .eq('user_id', req.body.userId);

    if (updateError) {
      console.error('Error updating upload count:', updateError);
      // Don't throw here, as the content was already uploaded
    }

    res.json({ 
      data, 
      accessCode,
      uploadCount: (userLimit?.current_uploads || 0) + 1,
      uploadLimit: userLimit?.upload_limit || 5
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get content by access code
app.get('/api/content/:accessCode', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('access_code', req.params.accessCode)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Record the view
    await supabase
      .from('content_views')
      .insert([
        {
          content_id: data.id,
          content_user_id: data.user_id,
          viewer_ip: req.ip,
          viewer_user_agent: req.headers['user-agent']
        }
      ]);

    res.json(data);
  } catch (error: any) {
    console.error('Get content error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get user upload limit endpoint
app.get('/api/user-limits/:userId', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Create default limit for user with increased limit
        const { data: newLimit, error: insertError } = await supabase
          .from('user_limits')
          .insert([{ 
            user_id: req.params.userId,
            upload_limit: 5, // Changed to 5 uploads
            current_uploads: 0
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        return res.json(newLimit);
      }
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Get user limits error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Admin middleware to check if user is admin
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (error || !userData?.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all users (admin only)
app.get('/api/admin/users', isAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        user_limits (
          upload_limit,
          current_uploads
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users = data.map(user => ({
      ...user,
      upload_limit: user.user_limits?.[0]?.upload_limit || 5,
      current_uploads: user.user_limits?.[0]?.current_uploads || 0
    }));

    res.json(users);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get all content with user details (admin only)
app.get('/api/admin/contents', isAdmin, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('contents')
      .select(`
        *,
        users:user_id (
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error: any) {
    console.error('Get contents error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get analytics data (admin only)
app.get('/api/admin/analytics', isAdmin, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    // Get total counts
    const [
      { count: totalUsers },
      { count: totalContent },
      { count: totalViews }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('contents').select('*', { count: 'exact', head: true }),
      supabase.from('content_views').select('*', { count: 'exact', head: true })
    ]);

    // Get recent views
    const { data: recentViews, error: viewsError } = await supabase
      .from('content_views')
      .select('created_at')
      .gte('created_at', subDays(new Date(), days).toISOString())
      .order('created_at', { ascending: true });

    if (viewsError) throw viewsError;

    // Get recent uploads
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('contents')
      .select('created_at')
      .gte('created_at', subDays(new Date(), days).toISOString())
      .order('created_at', { ascending: true });

    if (uploadsError) throw uploadsError;

    res.json({
      totalUsers: totalUsers || 0,
      totalContent: totalContent || 0,
      totalViews: totalViews || 0,
      recentViews: recentViews || [],
      recentUploads: recentUploads || []
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update user upload limit (admin only)
app.put('/api/admin/users/:userId/limit', isAdmin, async (req: Request, res: Response) => {
  try {
    const { upload_limit } = req.body;
    if (!upload_limit || upload_limit < 1) {
      return res.status(400).json({ error: 'Invalid upload limit' });
    }

    const { error } = await supabase
      .from('user_limits')
      .update({ upload_limit })
      .eq('user_id', req.params.userId);

    if (error) throw error;

    res.json({ message: 'Upload limit updated successfully' });
  } catch (error: any) {
    console.error('Update user limit error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete user and all their content (admin only)
app.delete('/api/admin/users/:userId', isAdmin, async (req: Request, res: Response) => {
  try {
    // Delete user's content first
    const { error: contentError } = await supabase
      .from('contents')
      .delete()
      .eq('user_id', req.params.userId);

    if (contentError) throw contentError;

    // Delete user's limits
    const { error: limitError } = await supabase
      .from('user_limits')
      .delete()
      .eq('user_id', req.params.userId);

    if (limitError) throw limitError;

    // Delete user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.userId);

    if (userError) throw userError;

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
