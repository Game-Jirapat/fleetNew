import re

class Extractor:
    def __init__(self, text):
        self.text = text
        self.patterns = {
            # 1. ทะเบียนรถ (เช่น 1นข4516)
            'plate': r'(?:ทะเบียนรถ|Vehicle|รถเลขที่)\s*[:\.]?\s*([0-9ก-ฮ]{1,2}[ก-ฮ]{1,2}\s?\d{1,4})',
            # 2. วันที่ (รองรับ DD/MM/YYYY)
            'date': r'(\d{2}/\d{2}/\d{4})',
            # 3. เลขผู้เสียภาษี กฟผ. (0994000244843)
            'egat_tax_id': r'(0994000244843)',
            # 4. ที่อยู่ กฟผ. (เน้นคำสำคัญ: บางกรวย, นนทบุรี)
          'egat_address': r'(\d{2}\s*หมู่ที่\s*\d+.*บางกรวย.*นนทบุรี\s*\d{5})'
        }

    def _format_date(self, date_str):
        if not date_str: return None
    # ใช้ Regex ดึงเฉพาะตัวเลข 3 ชุด (วัน/เดือน/ปี) เผื่อมีเวลาติดมาด้วย
        match = re.search(r'(\d{2})[/-](\d{2})[/-](\d{4})', date_str)
        if match:
            d, m, y = match.groups()
            y = int(y)
            if y > 2400: y -= 543 # แปลง พ.ศ. เป็น ค.ศ.
            return f"{y}-{m}-{d}" # ส่งกลับ YYYY-MM-DD
        return None

    def extract_all(self):
        return {
            'license_plate_no': self._find_pattern('plate'),
            'bill_date': self._find_pattern('date'),
            'egat_tax_id': self._find_pattern('egat_tax_id'),
            'egat_address': self._find_pattern('egat_address')
        }

    def _find_pattern(self, key):
        pattern = self.patterns.get(key)
        match = re.search(pattern, self.text, re.IGNORECASE | re.MULTILINE)
        return match.group(1) if match else None