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

    res.json({ data, accessCode });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
