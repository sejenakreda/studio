
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Nilai, Bobot } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAverage(numbers: number[]): number {
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  const sum = numbers.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);
  return sum / numbers.length;
}

export function calculateFinalGrade(nilai: Nilai, bobot: Bobot): number {
  if (!nilai || !bobot) {
    return 0;
  }

  const avgTugas = calculateAverage(nilai.tugas);

  const finalGrade =
    (avgTugas * (bobot.tugas / 100)) +
    ((nilai.tes || 0) * (bobot.tes / 100)) +
    ((nilai.pts || 0) * (bobot.pts / 100)) +
    ((nilai.pas || 0) * (bobot.pas / 100)) +
    ((nilai.kehadiran || 0) * (bobot.kehadiran / 100)) +
    ((nilai.eskul || 0) * (bobot.eskul / 100)) +
    ((nilai.osis || 0) * (bobot.osis / 100));
  
  // Round to 2 decimal places
  return Math.round(finalGrade * 100) / 100;
}

export function getAcademicYears(startYear = 2020): string[] {
  const endYear = 2049; // Target end year for the academic period like 2049/2050
  const years: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(`${year}/${year + 1}`); // Re-typed this line carefully
  }
  return years.reverse(); // Show most recent first
}

export function getCurrentAcademicYear(): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0 (Jan) - 11 (Dec)

  // Assuming new academic year starts in July (month index 6)
  if (currentMonth >= 6) { // July to December
    return `${currentYear}/${currentYear + 1}`;
  } else { // January to June
    return `${currentYear - 1}/${currentYear}`;
  }
}

export const SEMESTERS = [
  { value: 1, label: 'Ganjil' },
  { value: 2, label: 'Genap' },
];
