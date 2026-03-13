import sys
import json
import base64
import cv2
import numpy as np
import pytesseract
import platform
import re
from Extractor import Extractor

# 1. ตั้งค่า Encoding ให้รองรับภาษาไทยผ่าน Stdout
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 2. ตั้งค่า Path สำหรับ Tesseract ตามระบบปฏิบัติการ
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def process_ocr():
    try:
        # 3. รับข้อมูลรูปภาพจาก Node.js ผ่าน stdin
        image_data = sys.stdin.buffer.read()
        if not image_data:
            print(json.dumps({"error": "No image data received"}))
            return

        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print(json.dumps({"error": "Failed to decode image"}))
            return

        # 4. เตรียมรูปภาพ (Grayscale สำหรับ OCR แต่ใช้รูปสีสำหรับตีกรอบ)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 5. ทำ OCR เพื่อเอาทั้งข้อความและพิกัด (Bounding Boxes)
        # ใช้ psm 3 เพื่อสแกนหา Layout อัตโนมัติ
        d = pytesseract.image_to_data(gray, lang='tha+eng', output_type=pytesseract.Output.DICT)
        extracted_text = pytesseract.image_to_string(gray, lang='tha+eng', config='--psm 3')

        # 6. Logic การตีกรอบเฉพาะ 4 ข้อมูลสำคัญ
        # นิยาม Keywords ที่จะใช้ระบุตำแหน่งข้อมูล
        target_keywords = {
            'ทะเบียน': (0, 255, 0),       # สีเขียว
            '0994000244843': (0, 0, 255),  # สีแดง (เลขภาษี กฟผ.)
            'บางกรวย': (255, 165, 0),     # สีส้ม (ที่อยู่ กฟผ.)
            '/': (255, 0, 0)              # สีน้ำเงิน (ใช้ / เป็นตัวแทนของวันที่)
        }

        n_boxes = len(d['text'])
        for i in range(n_boxes):
            if int(d['conf'][i]) > 30: # กรองเฉพาะที่มั่นใจ
                text = d['text'][i]
                for key, color in target_keywords.items():
                    if key in text:
                        (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                        # วาดกล่องและขยายขอบเขตไปด้านขวา 180px เพื่อให้ครอบคลุมข้อมูลข้างหลัง Keyword
                        cv2.rectangle(img, (x - 5, y - 5), (x + w + 180, y + h + 10), color, 2)

        # 7. ใช้ Extractor ดึงข้อมูลมาเป็น JSON
        extractor = Extractor(extracted_text)
        parsed_data = extractor.extract_all()
        
        # 8. แปลงรูปที่ตีกรอบเสร็จแล้วเป็น Base64 เพื่อส่งกลับไป React
        debug_base64 = ""
        try:
            _, buffer = cv2.imencode('.jpg', img)
            debug_base64 = base64.b64encode(buffer).decode('utf-8')
        except:
            pass

        # 9. ส่งผลลัพธ์ออกทาง stdout
        output = {
            "status": "success",
            "extracted_text": extracted_text,
            "parsed_data": parsed_data,
            "debug_image": debug_base64
        }
        
        print(json.dumps(output, ensure_ascii=False))
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.stdout.flush()

if __name__ == "__main__":
    process_ocr()