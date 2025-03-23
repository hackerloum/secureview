// ... existing code ...

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

    // If no limit record exists, create one
    if (!userLimit) {
      const { error: insertError } = await supabase
        .from('user_limits')
        .insert([{ user_id: req.body.userId }]);

      if (insertError) {
        console.error('Error creating user limit:', insertError);
        return res.status(500).json({ error: 'Error setting up user limit' });
      }
    }

    // Check if user has reached their limit
    if (userLimit && userLimit.current_uploads >= userLimit.upload_limit) {
      return res.status(403).json({ 
        error: 'Upload limit reached',
        message: 'You have reached your upload limit. Please contact customer support to increase your limit.'
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

    res.json({ data, accessCode });
  } catch (error: any) {
    console.error('Upload error:', error);
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
        // Create default limit for user
        const { data: newLimit, error: insertError } = await supabase
          .from('user_limits')
          .insert([{ user_id: req.params.userId }])
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

// ... rest of the code ...
