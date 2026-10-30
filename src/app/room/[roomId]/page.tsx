import { RoomEntry } from '@/components/room-entry';
export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <RoomEntry roomId={roomId} />;
}
