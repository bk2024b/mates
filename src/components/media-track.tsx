'use client';
import { useEffect, useRef } from 'react';
import { type Track, type RemoteAudioTrack } from 'livekit-client';
export function VideoView({
  track,
  mirror = false,
  className = '',
}: {
  track: Track;
  mirror?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    element.muted = true;
    return () => {
      track.detach(element);
    };
  }, [track]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`${className} ${mirror ? 'mirrored' : ''}`}
    />
  );
}
export function AudioView({ track, volume }: { track: RemoteAudioTrack; volume: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const e = ref.current;
    if (!e) return;
    track.attach(e);
    return () => {
      track.detach(e);
    };
  }, [track]);
  useEffect(() => {
    track.setVolume(volume);
  }, [track, volume]);
  return <audio ref={ref} autoPlay />;
}

/** Audio et vidéo de la scène attachés au même élément pour favoriser leur synchronisation. */
export function ScreenView({
  track,
  audio,
  volume,
}: {
  track: Track;
  audio?: RemoteAudioTrack;
  volume: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    if (audio) audio.attach(element);
    element.muted = !audio;
    return () => {
      if (audio) audio.detach(element);
      track.detach(element);
    };
  }, [track, audio]);
  useEffect(() => {
    if (audio) audio.setVolume(volume);
  }, [audio, volume]);
  return <video ref={ref} autoPlay playsInline muted={!audio} className="screen-video" />;
}
