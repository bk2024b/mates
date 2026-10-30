import { z } from 'zod';
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'Deux caractères minimum.')
  .max(28, '28 caractères maximum.')
  .regex(/^[\p{L}\p{N} _.'’-]+$/u, 'Utilise des lettres, chiffres et espaces.');
export const createRoomSchema = z.object({
  name: nicknameSchema,
  title: z.string().trim().min(3).max(80),
});
export const joinRoomSchema = z.object({ name: nicknameSchema });
export const roomIdSchema = z.string().regex(/^mates-[a-f0-9]{24}$/);
export type RoomInfo = {
  id: string;
  title: string;
  participants: number;
  maxParticipants: number;
  createdAt: string;
};
export type JoinInfo = {
  token: string;
  serverUrl: string;
  identity: string;
  role: 'host' | 'guest';
  room: RoomInfo;
};
export type HealthInfo = { configured: boolean; missing: string[]; version: string };
export type MediaProfile = 'motion' | 'detail';
export type MediaQuality = 'auto' | 'high' | 'medium' | 'low';
