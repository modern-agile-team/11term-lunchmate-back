export function calculateAge(birthDate: string | Date): number {
  const today = new Date();
  const birth = new Date(birthDate);

  const age = today.getFullYear() - birth.getFullYear() + 1;

  return age;
}
