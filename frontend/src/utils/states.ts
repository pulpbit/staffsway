export const STATE_CODES: Record<string, string> = {
  'Andhra Pradesh': 'AP',
  'Arunachal Pradesh': 'AR',
  'Assam': 'AS',
  'Bihar': 'BR',
  'Chhattisgarh': 'CG',
  'Goa': 'GA',
  'Gujarat': 'GJ',
  'Haryana': 'HR',
  'Himachal Pradesh': 'HP',
  'Jammu and Kashmir': 'JK',
  'Jharkhand': 'JH',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Madhya Pradesh': 'MP',
  'Maharashtra': 'MH',
  'Manipur': 'MN',
  'Meghalaya': 'ML',
  'Mizoram': 'MZ',
  'Nagaland': 'NL',
  'Orissa': 'OR',
  'Odisha': 'OR',
  'Punjab': 'PB',
  'Rajasthan': 'RJ',
  'Sikkim': 'SK',
  'Tamil Nadu': 'TN',
  'Telangana': 'TS',
  'Tripura': 'TR',
  'Uttarakhand': 'UK',
  'Uttar Pradesh': 'UP',
  'West Bengal': 'WB',
  'Andaman and Nicobar Islands': 'AN',
  'Chandigarh': 'CH',
  'Dadra and Nagar Haveli': 'DH',
  'Daman and Diu': 'DD',
  'Delhi': 'DL',
  'Lakshadweep': 'LD',
  'Pondicherry': 'PY',
  'Puducherry': 'PY',
}

export function stateShort(raw: string | null | undefined): string {
  const s = (raw || '').trim()
  if (!s) return '—'
  const code = STATE_CODES[s]
  if (code) return code
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return s.slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase()
}