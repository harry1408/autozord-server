import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await userService.getUsers() });
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json({ success: true, data: await userService.createUser(req.body) });
  } catch (err) { next(err); }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await userService.updateUser(req.params.id, req.body) });
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
}
