import { z } from 'zod';
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'Deux caractères minimum.')
  .max(28, '28 caractères maximum.')
  .regex(/^[\p{L}\p{N} _.'’-]+$/u, 'Utilise des lettres, chiffres et espaces.');
export const cinemaSchema = z.object({
  phase: z.enum(['foyer', 'discussion']),
  description: z.string().max(240),
});
export type CinemaInfo = z.infer<typeof cinemaSchema>;
export type ShareSource = 'tab' | 'application';
export const createRoomSchema = z.object({
  name: nicknameSchema,
  title: z.string().trim().min(3).max(80),
  visibility: z.enum(['public', 'link']).default('link'),
  kind: z.enum(['lounge', 'cinema']).default('lounge'),
  description: z.string().trim().max(240).default(''),
});
export const joinRoomSchema = z.object({ name: nicknameSchema });
export const roomIdSchema = z.string().regex(/^mates-[a-f0-9]{24}$/);
export type RoomInfo = {
  id: string;
  title: string;
  participants: number;
  maxParticipants: number;
  createdAt: string;
  visibility?: 'public' | 'link';
  kind?: 'lounge' | 'cinema';
  cinema?: CinemaInfo;
};
export type JoinInfo = {
  token: string;
  serverUrl: string;
  identity: string;
  role: 'host' | 'guest';
  controls?: boolean;
  chat?: boolean;
  room: RoomInfo;
};
export type HealthInfo = { configured: boolean; missing: string[]; version: string };
export type MediaProfile = 'motion' | 'detail';
export type MediaQuality = 'auto' | 'high' | 'medium' | 'low';

export type ControlSnapshot = {
  identity: string;
  hostId: string;
  status: 'open' | 'closed';
  stageOwner: string | null;
  stageExpiresAt: string | null;
  busy: boolean;
  presenters: string[];
};
export type ControlAction =
  'acquire' | 'stop' | 'presenter_add' | 'presenter_remove' | 'kick' | 'close';
