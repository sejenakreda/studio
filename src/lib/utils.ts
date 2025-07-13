import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Nilai, Bobot, TugasTambahan, SchoolHoliday, TeacherDailyAttendance } from "@/types";
import { getSchoolHolidaysForMonth } from "./firestoreService";

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

  // Calculate base academic grade from components that sum to 100%
  const academicGrade =
    (avgTugas * (bobot.tugas / 100)) +
    ((nilai.tes || 0) * (bobot.tes / 100)) +
    ((nilai.pts || 0) * (bobot.pts / 100)) +
    ((nilai.pas || 0) * (bobot.pas / 100)) +
    ((nilai.kehadiran || 0) * (bobot.kehadiran / 100));

  // Calculate bonus points from Eskul and OSIS
  // Bobot.eskul and bobot.osis now represent the maximum bonus points these can add
  const eskulBonus = ((nilai.eskul || 0) / 100) * (bobot.eskul || 0);
  const osisBonus = ((nilai.osis || 0) / 100) * (bobot.osis || 0);
  
  let finalGradeWithBonus = academicGrade + eskulBonus + osisBonus;
  
  // Ensure final grade does not exceed 100
  finalGradeWithBonus = Math.min(100, finalGradeWithBonus);
  
  // Round to 2 decimal places
  return Math.round(finalGradeWithBonus * 100) / 100;
}

export function getAcademicYears(startYear = 2020): string[] {
  const endYear = 2049; // Target end year for the academic period like 2049/2050
  const years: string[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(`${year}/${year + 1}`);
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

/**
 * Calculates the number of working days in a given month and year.
 * It assumes Monday-Friday as workdays, excludes custom holidays,
 * and smartly adds weekend days if attendance was recorded on them.
 * @param year The full year (e.g., 2024).
 * @param month The month, 1-indexed (1 for January, 12 for December).
 * @param attendanceRecords The attendance records for the user for that month.
 * @returns The number of working days in that month.
 */
export async function getWorkdaysInMonth(year: number, month: number, attendanceRecords: TeacherDailyAttendance[] = []): Promise<number> {
  if (month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }

  // Fetch custom holidays for the given month and year
  const holidays = await getSchoolHolidaysForMonth(year, month);
  const holidayDateStrings = new Set(holidays.map(h => h.dateString));
  
  const daysInMonth = new Date(year, month, 0).getDate();
  let workdays = 0;
  const weekendAttendanceDays = new Set<string>();

  // First, find any weekend days where attendance was recorded
  attendanceRecords.forEach(rec => {
    const recDate = rec.date.toDate();
    const dayOfWeek = recDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      const dateString = `${recDate.getFullYear()}-${String(recDate.getMonth() + 1).padStart(2, '0')}-${String(recDate.getDate()).padStart(2, '0')}`;
      weekendAttendanceDays.add(dateString);
    }
  });

  // Calculate workdays
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // Sunday = 0, Saturday = 6
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isCustomHoliday = holidayDateStrings.has(dateString);

    if (isWeekend) {
      // If it's a weekend, only count it as a workday if attendance was explicitly recorded
      if (weekendAttendanceDays.has(dateString)) {
        workdays++;
      }
    } else {
      // If it's a weekday, count it unless it's a custom holiday
      if (!isCustomHoliday) {
        workdays++;
      }
    }
  }

  return workdays;
}


export const getActivityName = (activityId: TugasTambahan | string): string => {
    const nameMap: Record<TugasTambahan, string> = {
        pembina_osis: 'OSIS',
        kesiswaan: 'Kesiswaan',
        kurikulum: 'Kurikulum',
        bendahara: 'Bendahara',
        bk: 'Bimbingan Konseling',
        kepala_sekolah: 'Kepala Sekolah',
        kepala_tata_usaha: 'Kepala Tata Usaha',
        operator: 'Operator',
        staf_tu: 'Staf Tata Usaha',
        satpam: 'Satpam',
        penjaga_sekolah: 'Penjaga Sekolah',
        pembina_eskul_pmr: 'Ekstrakurikuler PMR',
        pembina_eskul_paskibra: 'Ekstrakurikuler Paskibra',
        pembina_eskul_pramuka: 'Ekstrakurikuler Pramuka',
        pembina_eskul_karawitan: 'Ekstrakurikuler Karawitan',
        pembina_eskul_pencak_silat: 'Ekstrakurikuler Pencak Silat',
        pembina_eskul_volly_ball: 'Ekstrakurikuler Volly Ball'
    };

    if (activityId in nameMap) {
        return nameMap[activityId as TugasTambahan];
    }
    
    // Fallback for any other potential string, though it should match TugasTambahan
    return activityId
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
