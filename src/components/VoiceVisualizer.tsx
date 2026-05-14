'use client';

import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  color?: string;
}

export default function VoiceVisualizer({ isActive, color = '#2563eb' }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const startVisualizer = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 256;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
          if (!canvasRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          animationRef.current = requestAnimationFrame(draw);
          analyserRef.current?.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height;
            
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.6;
            
            // Draw rounded bars centered vertically
            const y = (canvas.height - barHeight) / 2;
            
            // Draw a rounded rectangle for a premium feel
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth - 2, barHeight, 4);
            ctx.fill();

            x += barWidth;
          }
        };

        draw();
      } catch (err) {
        console.error("Visualizer error:", err);
      }
    };

    startVisualizer();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-12 rounded-lg opacity-80"
      width={300}
      height={48}
    />
  );
}
