import sys
import io
import json
import base64
import cv2
import numpy as np
import pytesseract
import platform
from Extractor import Extractor

# 1. ตั้งค่า Encoding และ Path สำหรับ Tesseract
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ตรวจสอบ OS: ถ้าเป็น Windows ให้ชี้ Path ไปที่ที่ติดตั้งไว้
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def process_ocr():
    try:
        image_data = sys.stdin.buffer.read()
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print(json.dumps({"error": "Decode failed"}))
            return

        # --- 🛠️ เพิ่ม Image Enhancement ---
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # ทำ Otsu's thresholding เพื่อให้ตัวอักษรชัดเจนขึ้น
        _, processed_img = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # รัน OCR
        extracted_text = pytesseract.image_to_string(processed_img, lang='tha+eng', config='--psm 3')

        extractor = Extractor(extracted_text)
        parsed_data = extractor.extract_all()

        # แปลงรูปที่ผ่านการ Threshold แล้วส่งกลับ (Debug Image)
        _, buffer = cv2.imencode('.jpg', processed_img)
        debug_base64 = base64.b64encode(buffer).decode('utf-8')

        output = {
            "status": "success",
            "extracted_text": extracted_text,
            "parsed_data": parsed_data,
            "debug_image": debug_base64 if 'debug_base64' in locals() else "" # ส่ง String ว่างแทน null
        }
        
        print(json.dumps(output, ensure_ascii=False))
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.stdout.flush()

if __name__ == "__main__":
    process_ocr()