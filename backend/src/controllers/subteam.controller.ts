import { Request, Response } from 'express';
import { subteamService } from '../services/subteam.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getSubteamsByTeam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const teamId = parseInt(req.params.id);
  if (isNaN(teamId)) {
    res.status(400).json({ success: false, message: 'ID de equipo inválido' });
    return;
  }

  const subteams = await subteamService.getSubteamsByTeam(teamId);
  res.status(200).json({
    success: true,
    data: subteams
  });
});

export const getSubteamById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subteamId = parseInt(req.params.subteamId);
  if (isNaN(subteamId)) {
    res.status(400).json({ success: false, message: 'ID de subequipo inválido' });
    return;
  }

  const subteam = await subteamService.getSubteamById(subteamId);
  if (!subteam) {
    res.status(404).json({ success: false, message: 'Subequipo no encontrado' });
    return;
  }

  res.status(200).json({
    success: true,
    data: subteam
  });
});

export const createSubteam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const teamId = parseInt(req.params.id);
  const { name, description, leaderId, userIds } = req.body;

  if (isNaN(teamId)) {
    res.status(400).json({ success: false, message: 'ID de equipo inválido' });
    return;
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ success: false, message: 'El nombre del subequipo es obligatorio' });
    return;
  }

  const newSubteam = await subteamService.createSubteam(teamId, {
    name: name.trim(),
    description: description || null,
    leaderId: leaderId ? Number(leaderId) : null,
    userIds: Array.isArray(userIds) ? userIds.map(Number) : []
  });

  res.status(201).json({
    success: true,
    data: newSubteam,
    message: 'Subequipo creado exitosamente'
  });
});

export const updateSubteam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subteamId = parseInt(req.params.subteamId);
  const { name, description, leaderId, isActive, userIds } = req.body;

  if (isNaN(subteamId)) {
    res.status(400).json({ success: false, message: 'ID de subequipo inválido' });
    return;
  }

  const updated = await subteamService.updateSubteam(subteamId, {
    name: name !== undefined ? String(name).trim() : undefined,
    description: description !== undefined ? description : undefined,
    leaderId: leaderId !== undefined ? (leaderId ? Number(leaderId) : null) : undefined,
    isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    userIds: Array.isArray(userIds) ? userIds.map(Number) : undefined
  });

  if (!updated) {
    res.status(404).json({ success: false, message: 'Subequipo no encontrado' });
    return;
  }

  res.status(200).json({
    success: true,
    data: updated,
    message: 'Subequipo actualizado exitosamente'
  });
});

export const deleteSubteam = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subteamId = parseInt(req.params.subteamId);
  if (isNaN(subteamId)) {
    res.status(400).json({ success: false, message: 'ID de subequipo inválido' });
    return;
  }

  const success = await subteamService.deleteSubteam(subteamId);
  if (!success) {
    res.status(404).json({ success: false, message: 'Subequipo no encontrado' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Subequipo eliminado exitosamente'
  });
});

export const getSubteamUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subteamId = parseInt(req.params.subteamId);
  if (isNaN(subteamId)) {
    res.status(400).json({ success: false, message: 'ID de subequipo inválido' });
    return;
  }

  const users = await subteamService.getSubteamUsers(subteamId);
  res.status(200).json({
    success: true,
    data: users
  });
});

export const updateSubteamUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const subteamId = parseInt(req.params.subteamId);
  const { userIds } = req.body;

  if (isNaN(subteamId)) {
    res.status(400).json({ success: false, message: 'ID de subequipo inválido' });
    return;
  }

  if (!Array.isArray(userIds)) {
    res.status(400).json({ success: false, message: 'userIds debe ser un arreglo de IDs' });
    return;
  }

  await subteamService.updateSubteamUsers(subteamId, userIds.map(Number));
  res.status(200).json({
    success: true,
    message: 'Miembros del subequipo actualizados exitosamente'
  });
});
