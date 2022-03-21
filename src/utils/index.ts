export const generateRandomName = (): string => {
  const randomName = Math.random()
    .toString(36)
    .substring(2, 15);
  return `${randomName}-${Date.now()}`;
}