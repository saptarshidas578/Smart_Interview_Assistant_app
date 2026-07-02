import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  stream: MediaStream | null;
}

export default function AudioVisualizer({ isActive, stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isActive || !stream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      drawIdleWave();
      return;
    }

    try {
      // Setup web audio api
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      visualize();
    } catch (e) {
      console.warn("Could not load Web Audio visualizer, using mock wave.", e);
      drawMockWave();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [isActive, stream]);

  const drawIdleWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(156, 163, 175, 0.4)"; // gray-400
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  const drawMockWave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let step = 0;
    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)"; // blue-500
      ctx.lineWidth = 3;
      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        const angle = (i / width) * Math.PI * 4 + step;
        const amplitude = Math.sin(step) * 15 + 15;
        const y = height / 2 + Math.sin(angle) * amplitude * Math.sin(i / width * Math.PI);
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }

      ctx.stroke();
      step += 0.1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const visualize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);
      
      const barWidth = (width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5;

        // Gradient for a high-tech modern audio visualizer
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "rgba(59, 130, 246, 0.6)"); // blue-500
        gradient.addColorStop(0.5, "rgba(147, 51, 234, 0.8)"); // purple-600
        gradient.addColorStop(1, "rgba(236, 72, 153, 1)"); // pink-500

        ctx.fillStyle = gradient;
        
        // Mirror effect centering the bars
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 2, barHeight || 2);

        x += barWidth;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-inner w-full">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isActive ? "bg-red-500 animate-pulse" : "bg-slate-400"}`} />
        <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
          {isActive ? "MICROPHONE STREAMING ACTIVE" : "MICROPHONE IDLE"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={350}
        height={60}
        className="w-full h-14 rounded-lg bg-white dark:bg-slate-950"
      />
    </div>
  );
}
