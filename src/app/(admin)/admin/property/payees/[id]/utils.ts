export function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}
