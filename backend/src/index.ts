import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
