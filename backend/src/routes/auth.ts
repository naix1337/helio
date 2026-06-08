// helio-app/backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queries } from '../db/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/auth/setup-status — public: has at least one user been created?
// ---------------------------------------------------------------------------
authRouter.get('/setup-status', (_req, res) => {
  const configured = queries.countUsers() > 0;
  res.json({ configured });
});

// ---------------------------------------------------------------------------
// POST /api/auth/setup — first-run admin creation
// ---------------------------------------------------------------------------
authRouter.post('/setup', async (req, res) => {
  // Guard: already configured
  if (queries.countUsers() > 0) {
    res.status(409).json({ error: 'Already configured' });
    return;
  }

  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = queries.createUser(email, name, passwordHash, 'admin');

  const token = signToken({ userId: id, email, role: 'admin' });

  res.status(201).json({
    token,
    user: { id, name, email, role: 'admin' },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = queries.getUserByEmail(email);

  // Use constant-time compare even when user not found to prevent timing attacks
  const passwordHash = user?.password_hash ?? '$2b$12$invalidhashplaceholder000000000000000000000000000000000';
  const match = await bcrypt.compare(password, passwordHash);

  if (!user || !match) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  queries.updateLastLogin(user.id);

  const token = signToken({ userId: user.id, email: user.email, role: user.role as import('../types.js').UserRole });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — protected: return fresh user data from DB
// ---------------------------------------------------------------------------
authRouter.get('/me', requireAuth, (req, res) => {
  const user = queries.getUserById(req.user!.userId);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    last_login: user.last_login,
  });
});
