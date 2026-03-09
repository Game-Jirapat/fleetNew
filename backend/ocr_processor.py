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
        # 2. รับ Image Buffer จาก Node.js (stdin)
        image_data = sys.stdin.buffer.read()
        if not image_data:
            print(json.dumps({"error": "No image data received"}, ensure_ascii=False))
            return

        # แปลงเป็น OpenCV Image
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print(json.dumps({"error": "Failed to decode image"}, ensure_ascii=False))
            return

        # 3. Pre-processing เบื้องต้น (Grayscale)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 4. ทำ OCR (ภาษาไทย + อังกฤษ)
        # config='--psm 3' สำหรับใบเสร็จทั่วไป หรือ '6' สำหรับข้อความที่เป็นบล็อก
        extracted_text = pytesseract.image_to_string(gray, lang='tha+eng', config='--psm 3')

        # 5. ใช้ Extractor (เวอร์ชัน Clean) ดึงข้อมูลที่จำเป็น
        extractor = Extractor(extracted_text)
        parsed_data = extractor.extract_all()

        # 6. สร้าง Debug Image (ตัวอย่างการตีกรอบ หรือส่งรูป Gray กลับไปดู)
        # ในที่นี้เราจะส่งรูป Gray กลับไปเพื่อประหยัด Bandwidth
        _, buffer = cv2.imencode('.jpg', gray)
        debug_base64 = base64.b64encode(buffer).decode('utf-8')

        # 7. ส่งผลลัพธ์กลับไปหา Node.js
        output = {
            "status": "success",
            "extracted_text": extracted_text,
            "parsed_data": parsed_data,
            "debug_image": debug_base64  # ส่งค่านี้ไปเก็บใน framed_pic
        }
        
        print(json.dumps(output, ensure_ascii=False))
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.stdout.flush()

if __name__ == "__main__":
    process_ocr()