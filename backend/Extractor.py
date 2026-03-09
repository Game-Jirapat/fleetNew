import re

class Extractor:
    def __init__(self, text):
        self.text = text
        # รวม Pattern ที่ใช้บ่อยไว้ที่นี่
        self.patterns = {
            'plate': r'(\d[ก-ฮ]{2}\s?\d{1,4})',
            'date': r'(\d{2}/\d{2}/\d{4})|(\d{2}-\d{2}-\d{4})',
            'amount': r'(?:TOTAL|รวมเป็นเงิน|ยอดรวม)\s*[:\.]?\s*([\d,]+\.\d{2})',
            'tax_id': r'(?:TAX ID|เลขประจำตัวผู้เสียภาษี)\s*[:\.]?\s*(\d{13})'
        }

    def extract_all(self):
        """ดึงข้อมูลเฉพาะที่จำเป็นตาม Schema ใหม่"""
        results = {
            'license_plate_no': self._find_pattern('plate'),
            'bill_date': self._format_date(self._find_pattern('date')),
            'amount': self._clean_number(self._find_pattern('amount')),
            'tax_inv_no': self._find_pattern(r'(?:TAX INV NO|เลขที่ใบกำกับภาษี)\s*[:\.]?\s*([A-Z0-9\-]+)'),
            'gas_station': self._find_gas_station()
        }
        return results

    def _find_pattern(self, key_or_pattern):
        pattern = self.patterns.get(key_or_pattern, key_or_pattern)
        match = re.search(pattern, self.text, re.IGNORECASE | re.MULTILINE)
        return match.group(1) if match else None

    def _format_date(self, date_str):
        if not date_str: return None
        # แปลงวันที่ให้เป็น Format YYYY-MM-DD สำหรับ Database
        # (Logic ย่อสำหรับการตรวจสอบปี พ.ศ./ค.ศ. สามารถเพิ่มได้ที่นี่)
        return date_str.replace('/', '-')

    def _clean_number(self, num_str):
        if not num_str: return None
        return float(num_str.replace(',', ''))

    def _find_gas_station(self):
        stations = ['PTT', 'BANGCHAK', 'SHELL', 'CALTEX', 'OR']
        for station in stations:
            if station in self.text.upper():
                return station
        return "Unknown"