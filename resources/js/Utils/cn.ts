import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Menggabungkan class Tailwind secara dinamis dan mengatasi konflik style.
 * Esensial untuk membuat Reusable UI Components.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
