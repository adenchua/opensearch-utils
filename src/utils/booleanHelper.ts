export default function isTrue(value: string): boolean {
  return ["true", "1"].includes(value.toLowerCase());
}
