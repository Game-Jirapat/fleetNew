import re
from datetime import datetime

class Extractor:
    def __init__(self, text):
        self.text = text
        self.patterns = {
            # ปรับให้รองรับทะเบียนรถไทย เช่น 1กข 1234
            'plate': r'(\d?[ก-ฮ]{2}\s?\d{1,4})',
            'date': r'(\d{2}/\d{2}/\d{4})|(\d{2}-\d{2}-\d{4})',
            'amount': r'(?:TOTAL|รวมเป็นเงิน|ยอดรวม|จำนวนเงิน)\s*[:\.]?\s*([\d,]+\.\d{2})',
        }

    def extract_all(self):
        results = {
            'license_plate_no': self._find_pattern('plate'),
            'bill_date': self._format_date(self._find_pattern('date')),
            'amount': self._clean_number(self._find_pattern('amount')),
            'gas_station': self._find_gas_station()
        }
        return results

    def _find_pattern(self, key):
        pattern = self.patterns.get(key)
        match = re.search(pattern, self.text, re.IGNORECASE | re.MULTILINE)
        return match.group(1) if match else None

    def _format_date(self, date_str):
        if not date_str: return None
        # ลบ / หรือ - ออกเพื่อจัดการ
        clean_date = re.sub(r'[/-]', ' ', date_str).split()
        if len(clean_date) == 3:
            d, m, y = clean_date
            y = int(y)
            if y > 2500: y -= 543 # แปลง พ.ศ. เป็น ค.ศ.
            return f"{y}-{m}-{d}"
        return None

    def _clean_number(self, num_str):
        if not num_str: return 0.0
        return float(re.sub(r'[^\d.]', '', num_str))

    def _find_gas_station(self):
        for s in ['PTT', 'OR', 'BANGCHAK', 'SHELL', 'CALTEX']:
            if s in self.text.upper(): return s
        return "Unknown"