export default function Background() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% -10%, #2a3550 0%, #182238 45%, #0d1424 100%)",
      }}
    >
      <div
        className="animate-ambient absolute -top-32 left-1/4 h-[44rem] w-[44rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255, 200, 140, 0.16) 0%, transparent 60%)",
        }}
      />
      <div
        className="animate-ambient absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(140, 200, 255, 0.12) 0%, transparent 60%)",
          animationDelay: "-6s",
        }}
      />
      <div
        className="animate-ambient absolute -bottom-40 left-1/3 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(180, 160, 255, 0.10) 0%, transparent 60%)",
          animationDelay: "-12s",
        }}
      />
    </div>
  );
}
