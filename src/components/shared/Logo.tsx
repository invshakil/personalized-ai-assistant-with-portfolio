type LogoProps = {
  size?: number;
};

export default function Logo({ size = 36 }: LogoProps) {
  const radius = Math.max(6, Math.round(size * 0.22));
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        background: "linear-gradient(135deg, #3d5a80 0%, #6b4d8f 100%)",
        color: "#fff",
        fontFamily: "var(--font-dm-serif), Georgia, 'Times New Roman', serif",
        fontWeight: 400,
        fontSize: Math.round(size * 0.62),
        lineHeight: 1,
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      S
    </span>
  );
}
