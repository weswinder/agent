import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import {
  GetRateLimitValueQuery,
  useRateLimit,
  UseRateLimitOptions,
} from "@convex-dev/rate-limiter/react";

export const Monitor = (
  props: UseRateLimitOptions & {
    getRateLimitValueQuery: GetRateLimitValueQuery;
  },
) => {
  // UI state
  const [timelineData, setTimelineData] = useState<
    Array<{ timestamp: number; value: number }>
  >([]);

  // API calls
  const rateLimitValue = useQuery(props.getRateLimitValueQuery, {
    name: props.name,
  });
  const capacity = rateLimitValue?.config.capacity ?? 0;
  const { status, check } = useRateLimit(props.getRateLimitValueQuery, props);

  // Timeline visualization logic with proper DPI scaling
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const canvasSetupRef = useRef<{
    width: number;
    height: number;
    dpr: number;
  } | null>(null);

  // Update timeline data every 250ms with calculated values
  useEffect(() => {
    if (!status) return;

    const updateTimeline = () => {
      const now = Date.now();
      // Calculate current value using server time for rate limit calculation
      const calculated = check(now, 0);
      if (!calculated) return;
      const newPoint = { timestamp: now, value: calculated.value }; // Keep client time for UI

      setTimelineData((prev) => {
        const filtered = prev.filter((point) => now - point.timestamp < 10000); // Keep last 10 seconds
        return [...filtered, newPoint];
      });
    };

    // Initial update
    updateTimeline();

    // Set up interval for regular updates
    const interval = setInterval(updateTimeline, 100);

    return () => {
      clearInterval(interval);
    };
  }, [status, check]);

  // Setup canvas with proper DPI scaling (only when size changes)
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Check if we need to resize
    const currentSetup = canvasSetupRef.current;
    if (
      currentSetup &&
      currentSetup.width === rect.width &&
      currentSetup.height === rect.height &&
      currentSetup.dpr === dpr
    ) {
      return canvas.getContext("2d");
    }

    // Set actual size in memory (scaled to account for pixel ratio)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale CSS size back down
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    // Get context and scale it
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Store the current setup
    canvasSetupRef.current = { width: rect.width, height: rect.height, dpr };

    return ctx;
  }, []);

  // Draw timeline with smooth rendering
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const { width, height } = rect;
    const now = Date.now();
    const tenSecondsAgo = now - 10000;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up drawing parameters
    const padding = 60;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    // Draw background grid
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines (values)
    for (
      let i = 0;
      i <= capacity + 2;
      i += Math.max(1, Math.floor((capacity + 2) / 8))
    ) {
      const y = height - padding - (i / (capacity + 2)) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw axes with better styling
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw capacity line with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#f59e0b");
    gradient.addColorStop(1, "#d97706");

    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    const capacityY =
      height - padding - (capacity / (capacity + 2)) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padding, capacityY);
    ctx.lineTo(width - padding, capacityY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw timeline data with smooth curves
    if (timelineData.length > 0) {
      // Create gradient for the line
      const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
      lineGradient.addColorStop(0, "#3b82f6");
      lineGradient.addColorStop(1, "#1d4ed8");

      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(59, 130, 246, 0.3)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();

      // Start with a line from Y-axis to the first data point to eliminate gaps
      const firstPoint = timelineData[0];
      const firstX =
        padding + ((firstPoint.timestamp - tenSecondsAgo) / 10000) * plotWidth;
      const firstY =
        height -
        padding -
        (Math.max(0, firstPoint.value) / (capacity + 2)) * plotHeight;

      // Only draw connecting line if first point is within visible area
      if (firstX >= padding) {
        // Draw line from Y-axis to first point at the same height
        ctx.moveTo(padding, firstY);
        ctx.lineTo(firstX, firstY);
      }

      timelineData.forEach((point, index) => {
        const x =
          padding + ((point.timestamp - tenSecondsAgo) / 10000) * plotWidth;
        const y =
          height -
          padding -
          (Math.max(0, point.value) / (capacity + 2)) * plotHeight;

        if (index === 0) {
          // If we didn't draw connecting line, start here
          if (firstX < padding) {
            ctx.moveTo(Math.max(padding, x), y);
          }
        } else {
          ctx.lineTo(Math.max(padding, x), y);
        }
      });

      // Extend line to the right edge with current value
      if (timelineData.length > 0) {
        const lastPoint = timelineData[timelineData.length - 1];
        const lastY =
          height -
          padding -
          (Math.max(0, lastPoint.value) / (capacity + 2)) * plotHeight;
        ctx.lineTo(width - padding, lastY);
      }

      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Draw current value indicator (always at right edge)
      const lastPoint = timelineData[timelineData.length - 1];
      const y =
        height -
        padding -
        (Math.max(0, lastPoint.value) / (capacity + 2)) * plotHeight;

      // Value label with modern styling (positioned to the right of the graph)
      const labelText = lastPoint.value.toFixed(1);
      const labelMetrics = ctx.measureText(labelText);
      const labelWidth = labelMetrics.width + 16;
      const labelHeight = 24;
      const labelX = width - padding + 15; // Position to the right of the graph
      const labelY = Math.max(y + labelHeight / 2, padding + labelHeight);

      // Label background with shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(
        labelX + 2,
        labelY - labelHeight + 2,
        labelWidth,
        labelHeight,
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(labelX, labelY - labelHeight, labelWidth, labelHeight);

      // Label border
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.strokeRect(labelX, labelY - labelHeight, labelWidth, labelHeight);

      // Label text
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labelText, labelX + labelWidth / 2, labelY - 6);
    }

    // Draw axis labels with modern typography
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "right";

    // Y-axis labels - position them better to avoid overlap
    for (
      let i = 0;
      i <= capacity + 2;
      i += Math.max(1, Math.floor((capacity + 2) / 5))
    ) {
      const y = height - padding - (i / (capacity + 2)) * plotHeight;
      ctx.fillText(i.toString(), padding - 10, y + 4);
    }

    // X-axis labels
    ctx.textAlign = "center";
    ctx.fillText("10s ago", padding, height - 10);
    ctx.fillText("5s ago", padding + plotWidth / 2, height - 10);
    ctx.fillText("now", width - padding, height - 10);

    // Axis titles
    ctx.fillStyle = "#374151";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.save();
    ctx.translate(25, height / 2); // Move the y-axis title further left
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Available Tokens", 0, 0);
    ctx.restore();

    ctx.fillText("Time", width / 2, height - 25);

    // Schedule next frame
    animationRef.current = requestAnimationFrame(drawTimeline);
  }, [timelineData, capacity]);

  // Setup canvas when component mounts or container size changes
  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  // Start animation loop
  useEffect(() => {
    drawTimeline();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawTimeline]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setupCanvas();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="w-full max-w-7xl mx-auto p-6 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
            Rate Limiter Playground
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experiment with different rate limiting strategies and watch how
            they behave in real-time
          </p>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
              <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
              Real-time Timeline
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Token availability and consumption over the last 10 seconds
            </p>
          </div>

          <div className="p-6">
            <div
              ref={containerRef}
              className="relative w-full bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200"
              style={{ height: "320px" }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-gradient-to-r from-primary-500 to-primary-700 rounded"></div>
                <span className="text-gray-700 font-medium">
                  Available tokens
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success-500 rounded-full border border-white"></div>
                <span className="text-gray-700 font-medium">
                  Successful consumption
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-error-500 rounded-full border border-white"></div>
                <span className="text-gray-700 font-medium">
                  Failed consumption
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-yellow-500"></div>
                <span className="text-gray-700 font-medium">
                  Capacity limit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;
