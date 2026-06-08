// helio-app/backend/src/routes/team.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { queries } from '../db/index.js';
import type { UserRole } from '../types.js';

export const teamRouter = Router();

const VALID_ROLES: UserRole[] = ['admin', 'editor', 'viewer'];

// ---------------------------------------------------------------------------
// GET /api/team — list all users (admin-only, enforced at mount point)
// ---------------------------------------------------------------------------
teamRouter.get('/', (_req, res) => {
  try {
    const users = queries.getAllUsers();
    // Explicit field projection: getAllUsers() already excludes password_hash at the
    // SQL level, but we project here too so any future schema change can't leak it.
    const safe = users.map(({ id, name, email, role, created_at, last_login }) => ({
      id, name, email, role, created_at, last_login,
    }));
    res.json(safe);
  } catch (err) {
    console.error('[team/list] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/team — create a new user (admin-only, enforced at mount point)
// ---------------------------------------------------------------------------
teamRouter.post('/', async (req, res) => {
  try {
    const { name, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };
    const email = (req.body.email as string | undefined)?.trim().toLowerCase();

    // Validate required fields
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'name, email, password and role are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    if (!VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({ error: 'role must be admin, editor, or viewer' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let id: number;
    try {
      id = queries.createUser(email, name, passwordHash, role);
    } catch (err: unknown) {
      // SQLite UNIQUE constraint violation
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE') || message.includes('unique')) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
      throw err;
    }

    res.status(201).json({ id, name, email, role });
  } catch (err) {
    console.error('[team/POST] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/team/:id — update user role (admin-only, enforced at mount point)
// ---------------------------------------------------------------------------
teamRouter.put('/:id', (req, res) => {
  try {
    const targetId = Number(req.params.id);

    if (isNaN(targetId)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }

    // Prevent changing own role
    if (req.user!.userId === targetId) {
      res.status(403).json({ error: 'Cannot change your own role' });
      return;
    }

    const { role } = req.body as { role?: string };

    if (!role || !VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({ error: 'role must be admin, editor, or viewer' });
      return;
    }

    const user = queries.getUserById(targetId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    queries.updateUserRole(targetId, role);
    res.json({ ok: true });
  } catch (err) {
    console.error('[team/PUT] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/team/:id — remove user (admin-only, enforced at mount point)
// ---------------------------------------------------------------------------
teamRouter.delete('/:id', (req, res) => {
  try {
    const targetId = Number(req.params.id);

    if (isNaN(targetId)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }

    // Prevent self-deletion
    if (req.user!.userId === targetId) {
      res.status(403).json({ error: 'Cannot delete your own account' });
      return;
    }

    const user = queries.getUserById(targetId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    queries.deleteUser(targetId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[team/DELETE] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
