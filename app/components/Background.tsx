export default function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: "#1a2540" }}
    >
      {/* Subtle ambient glow at the top-center — same hue family,
          only adds a tiny bit of brightness near the top, never darkens the edges. */}
      <div
        className="animate-ambient absolute left-1/2 top-[-30%] h-[80vh] w-[80vh] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(140, 170, 230, 0.18) 0%, transparent 65%)",
        }}
      />
    </div>
  );
}
