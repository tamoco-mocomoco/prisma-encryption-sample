import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma, encryptedPrisma } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from React Router build (production only)
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../build/client');
  app.use(express.static(buildPath));
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Get encryption key (FOR DEMO PURPOSES ONLY - NEVER DO THIS IN PRODUCTION)
app.get('/api/config', (req: Request, res: Response) => {
  res.json({
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  });
});

// Get all users with both encrypted and decrypted data
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    // Get raw data (encrypted)
    const rawUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Get decrypted data
    const decryptedUsers = await encryptedPrisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Combine both for comparison
    const combinedUsers = rawUsers.map((rawUser, index) => ({
      id: rawUser.id,
      name: rawUser.name,
      encrypted: {
        email: rawUser.email,
        phone: rawUser.phone,
        address: rawUser.address,
      },
      decrypted: {
        email: decryptedUsers[index]?.email || '',
        phone: decryptedUsers[index]?.phone || '',
        address: decryptedUsers[index]?.address || '',
      },
      createdAt: rawUser.createdAt,
    }));

    res.json(combinedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name || !email || !phone || !address) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    // Create user with encrypted fields
    const newUser = await encryptedPrisma.user.create({
      data: {
        name,
        email,
        phone,
        address,
      },
    });

    // Get raw (encrypted) version
    const rawUser = await prisma.user.findUnique({
      where: { id: newUser.id },
    });

    res.json({
      id: newUser.id,
      name: newUser.name,
      encrypted: {
        email: rawUser?.email || '',
        phone: rawUser?.phone || '',
        address: rawUser?.address || '',
      },
      decrypted: {
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
      },
      createdAt: newUser.createdAt,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete a user
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Serve React Router app for all other routes (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req: Request, res: Response) => {
    const buildPath = path.join(__dirname, '../build/client');
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Start API server
const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
app.listen(port, '0.0.0.0', () => {
  console.log(`API server running on http://localhost:${port}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Frontend available at http://localhost:${port}`);
  }
});

// In development, frontend runs separately on port 3000
if (process.env.NODE_ENV !== 'production') {
  console.log(`Frontend dev server should be running on http://localhost:${CLIENT_PORT}`);
}
