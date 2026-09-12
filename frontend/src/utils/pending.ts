export const PENDING_LABELS: Record<string, string> = {
  dob: 'DOB',
  father_name: "Father's Name",
  uan: 'UAN No.',
  esi_number: 'ESIC No.',
  bank_account: 'Bank A/C No.',
  bank_ifsc: 'IFSC Code',
}

export const PENDING_KEYS = ['dob', 'father_name', 'uan', 'esi_number', 'bank_account', 'bank_ifsc']

export function isPending(value: any): boolean {
  return !String(value ?? '').trim()
}