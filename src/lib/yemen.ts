/**
 * Yemen Governorates Data
 * المحافظات اليمنية
 */

export const yemenGovernorates = [
  { id: "sanaa", nameAr: "صنعاء", name: "Sana'a", deliveryFee: 0 },
  { id: "aden", nameAr: "عدن", name: "Aden", deliveryFee: 1500 },
  { id: "taiz", nameAr: "تعز", name: "Taiz", deliveryFee: 1000 },
  { id: "hudaydah", nameAr: "الحديدة", name: "Al Hudaydah", deliveryFee: 800 },
  { id: "ibb", nameAr: "إب", name: "Ibb", deliveryFee: 1000 },
  { id: "dhamar", nameAr: "ذمار", name: "Dhamar", deliveryFee: 500 },
  { id: "hadramaut", nameAr: "حضرموت", name: "Hadramaut", deliveryFee: 2500 },
  { id: "mukalla", nameAr: "المكلا", name: "Mukalla", deliveryFee: 2500 },
  { id: "hajjah", nameAr: "حجة", name: "Hajjah", deliveryFee: 800 },
  { id: "saada", nameAr: "صعدة", name: "Saada", deliveryFee: 1200 },
  { id: "marib", nameAr: "مأرب", name: "Marib", deliveryFee: 1000 },
  { id: "amran", nameAr: "عمران", name: "Amran", deliveryFee: 500 },
  { id: "al_bayda", nameAr: "البيضاء", name: "Al Bayda", deliveryFee: 1000 },
  { id: "al_mahwit", nameAr: "المحويت", name: "Al Mahwit", deliveryFee: 800 },
  { id: "al_dhale", nameAr: "الضالع", name: "Al Dhale", deliveryFee: 1000 },
  { id: "lahij", nameAr: "لحج", name: "Lahij", deliveryFee: 1200 },
  { id: "shabwah", nameAr: "شبوة", name: "Shabwah", deliveryFee: 1500 },
  { id: "al_jawf", nameAr: "الجوف", name: "Al Jawf", deliveryFee: 1500 },
  { id: "raymah", nameAr: "ريمة", name: "Raymah", deliveryFee: 800 },
  { id: "al_mahrah", nameAr: "المهرة", name: "Al Mahrah", deliveryFee: 3000 },
  { id: "sanaa_city", nameAr: "أمانة العاصمة", name: "Sana'a City", deliveryFee: 0 },
  { id: "socotra", nameAr: "سقطرى", name: "Socotra", deliveryFee: 5000 },
];

/**
 * Get governorate by ID
 */
export function getGovernorateById(id: string) {
  return yemenGovernorates.find(g => g.id === id);
}

/**
 * Calculate delivery fee based on governorate
 */
export function calculateDeliveryFee(governorateId: string): number {
  const governorate = getGovernorateById(governorateId);
  return governorate?.deliveryFee || 1500;
}

/**
 * Format Yemeni phone number
 */
export function formatYemeniPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with +967, remove it for formatting
  const withoutCountryCode = digits.replace(/^967/, '');
  
  // Yemeni mobile format: 7XX XXX XXX
  if (withoutCountryCode.length === 9 && withoutCountryCode.startsWith('7')) {
    return `+967 ${withoutCountryCode.slice(0, 3)} ${withoutCountryCode.slice(3, 6)} ${withoutCountryCode.slice(6)}`;
  }
  
  return phone;
}

/**
 * Validate Yemeni phone number
 */
export function validateYemeniPhone(phone: string): { valid: boolean; message: string } {
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a Yemeni number (starts with 967 or just 7)
  if (digits.startsWith('967')) {
    const withoutCountryCode = digits.slice(3);
    if (withoutCountryCode.length === 9 && withoutCountryCode.startsWith('7')) {
      return { valid: true, message: "رقم يمني صحيح" };
    }
  }
  
  // Check if it's just the mobile number without country code
  if (digits.length === 9 && digits.startsWith('7')) {
    return { valid: true, message: "رقم يمني صحيح" };
  }
  
  // Saudi format for compatibility
  if (digits.length === 10 && digits.startsWith('05')) {
    return { valid: true, message: "رقم سعودي صحيح" };
  }
  
  return { valid: false, message: "رقم الهاتف غير صحيح" };
}
