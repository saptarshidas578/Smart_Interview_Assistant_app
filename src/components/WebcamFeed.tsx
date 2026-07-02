import { useEffect, useRef, useState } from "react";
import { Camera, Eye, AlertCircle, RefreshCw } from "lucide-react";
import { AttentionMetrics } from "../types";

interface WebcamFeedProps {
  isMonitoring: boolean;
  onMetricsUpdate?: (metrics: AttentionMetrics) => void;
}

export default function WebcamFeed({ isMonitoring, onMetricsUpdate }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<AttentionMetrics>({
    eyeContactRatio: 90,
    attentionScore: 95,
    headPosture: "Centered",
    emotion: "Confident"
  });

  // Setup stream
  useEffect(() => {
    if (isMonitoring) {
      navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 }, audio: false })
        .then((s) => {
          setStream(s);
          setHasPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error("Camera access failed", err);
          setHasPermission(false);
        });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isMonitoring]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Simulated eye contact & metrics update tick
  useEffect(() => {
    if (!isMonitoring || !stream) return;

    const interval = setInterval(() => {
      // Simulate real-time tracking variations
      const eyeContactVariation = Math.floor(Math.random() * 15) - 5; // bias upwards
      const newEyeContact = Math.min(100, Math.max(40, metrics.eyeContactRatio + eyeContactVariation));
      
      const attentionVariation = Math.floor(Math.random() * 10) - 3;
      const newAttention = Math.min(100, Math.max(50, metrics.attentionScore + attentionVariation));

      const postures: AttentionMetrics["headPosture"][] = ["Centered", "Centered", "Centered", "Looking Away", "Looking Down"];
      const newPosture = postures[Math.floor(Math.random() * postures.length)];

      const emotions: AttentionMetrics["emotion"][] = ["Confident", "Confident", "Thoughtful", "Smiling", "Neutral", "Nervous"];
      const newEmotion = emotions[Math.floor(Math.random() * emotions.length)];

      const updatedMetrics: AttentionMetrics = {
        eyeContactRatio: newPosture === "Centered" ? newEyeContact : Math.max(20, newEyeContact - 40),
        attentionScore: newPosture === "Centered" ? newAttention : Math.max(15, newAttention - 50),
        headPosture: newPosture,
        emotion: newPosture === "Centered" ? newEmotion : "Neutral"
      };

      setMetrics(updatedMetrics);
      if (onMetricsUpdate) {
        onMetricsUpdate(updatedMetrics);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isMonitoring, stream, metrics]);

  // Canvas facial mesh tracking simulation loop
  useEffect(() => {
    if (!isMonitoring || !stream) return;

    let animId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawSimulation = () => {
      if (video.paused || video.ended) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw simulated green box or facial landmarks overlay
      if (metrics.headPosture === "Centered") {
        ctx.strokeStyle = "rgba(16, 185, 129, 0.75)"; // green-500
        ctx.lineWidth = 2;

        // Draw simulated eyes detection boxes
        ctx.strokeRect(w * 0.35, h * 0.35, 25, 15);
        ctx.strokeRect(w * 0.53, h * 0.35, 25, 15);

        // Draw nose and mouth indicators
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.4);
        ctx.lineTo(w * 0.5, h * 0.5);
        ctx.stroke();

        ctx.strokeRect(w * 0.42, h * 0.6, 50, 10);

        // Simulated text overlays
        ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
        ctx.font = "10px monospace";
        ctx.fillText("ATTENTION: 100%", 10, 20);
        ctx.fillText(`POSE: ${metrics.headPosture.toUpperCase()}`, 10, 32);
        ctx.fillText(`STATE: ${metrics.emotion.toUpperCase()}`, 10, 44);
      } else {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.75)"; // red-500
        ctx.lineWidth = 2;

        // Draw warning indicators
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        ctx.font = "10px monospace";
        ctx.fillText("ATTENTION COMPROMISED", 10, 20);
        ctx.fillText(`POSE: ${metrics.headPosture.toUpperCase()}`, 10, 32);
      }

      animId = requestAnimationFrame(drawSimulation);
    };

    // Wait for video meta
    video.addEventListener("play", () => {
      animId = requestAnimationFrame(drawSimulation);
    });

    if (!video.paused) {
      animId = requestAnimationFrame(drawSimulation);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isMonitoring, stream, metrics.headPosture]);

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video w-full flex items-center justify-center text-white">
      {hasPermission === false ? (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-xs">
          <AlertCircle className="w-12 h-12 text-yellow-500 mb-3" />
          <h4 className="text-sm font-semibold mb-1">Camera Permission Blocked</h4>
          <p className="text-xs text-slate-400 mb-4">
            Enable camera permissions in your browser to test live eye contact, emotion, and posture coaching.
          </p>
          <button
            onClick={() => {
              setHasPermission(null);
              navigator.mediaDevices.getUserMedia({ video: true }).then(() => setHasPermission(true));
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-request Access
          </button>
        </div>
      ) : hasPermission === null ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 animate-pulse">
            <Camera className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 font-mono">WAITING FOR VIDEO FEED...</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Eye Contact floating badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur px-2.5 py-1 rounded-full border border-emerald-500/25 text-emerald-400 text-xs font-mono font-bold animate-pulse">
            <Eye className="w-3.5 h-3.5" />
            <span>EYE CONTACT: {metrics.eyeContactRatio}%</span>
          </div>

          {/* Attention indicator */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono leading-tight space-y-0.5">
            <div className="text-slate-400">EMOTION: <span className="text-indigo-400 font-bold">{metrics.emotion}</span></div>
            <div className="text-slate-400">HEAD POSTURE: <span className="text-sky-400 font-bold">{metrics.headPosture}</span></div>
          </div>
        </>
      )}
    </div>
  );
}
