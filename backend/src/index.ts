import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

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
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
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
          access_code,
          created_by: req.body.userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ data, accessCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get content by access code
app.get('/api/content/:accessCode', async (req, res) => {
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

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
