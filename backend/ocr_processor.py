import sys
import json
import base64
import cv2
import numpy as np
import pytesseract
import platform
from Extractor import Extractor

# 1. ตั้งค่าพื้นฐาน
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def process_ocr():
    try:
        # ✅ รับประเภทใบเสร็จจาก Argument (ส่งมาจาก Node.js)
        receipt_type = sys.argv[2] if len(sys.argv) > 2 else "1"
        
        image_data = sys.stdin.buffer.read()
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print(json.dumps({"error": "Decode failed"}))
            return

        # --- 2. Preprocessing (ทำเหมือนกันทั้ง 2 แบบ) ---
        img_resized = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        processed_img = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )

        # --- 3. OCR Extraction ---
        d = pytesseract.image_to_data(processed_img, lang='tha+eng', output_type=pytesseract.Output.DICT)
        extracted_text = pytesseract.image_to_string(processed_img, lang='tha+eng', config='--psm 3')
        
        # เตรียมรูปสำหรับวาดเส้น (แปลงขาวดำกลับเป็นสี)
        debug_output_img = cv2.cvtColor(processed_img, cv2.COLOR_GRAY2BGR)

        # --- 4. 🚀 แยก Logic การตีกรอบตามประเภทใบเสร็จ ---
        n_boxes = len(d['text'])
        
        if receipt_type == "1":
            # 📝 โครงสำหรับการตีกรอบแบบที่ 1 (เช่น Thermal Slip)
            # คุณสามารถมาแก้รายละเอียดการหา Keywords ตรงนี้ทีหลัง
            target_keywords = {'ทะเบียน': (0, 255, 0), '0994': (0, 0, 255)} 
            for i in range(n_boxes):
                if int(d['conf'][i]) > 30:
                    text = d['text'][i]
                    for key, color in target_keywords.items():
                        if key in text:
                            (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                            cv2.rectangle(debug_output_img, (x-5, y-5), (x+w+150, y+h+10), color, 2)
                            
        elif receipt_type == "2":
            # 📝 โครงสำหรับการตีกรอบแบบที่ 2 (เช่น A4 Full Page)
            # แยกเงื่อนไขหรือ Keywords ต่างกันได้ที่นี่
            target_keywords = {'ใบกำกับภาษี': (255, 0, 0), 'กฟผ': (255, 165, 0)}
            for i in range(n_boxes):
                if int(d['conf'][i]) > 30:
                    text = d['text'][i]
                    for key, color in target_keywords.items():
                        if key in text:
                            (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                            # ตัวอย่าง: แบบที่ 2 อาจจะตีกรอบกว้างกว่า
                            cv2.rectangle(debug_output_img, (x-10, y-10), (x+w+300, y+h+20), color, 3)

        # --- 5. ส่งข้อมูลกลับ ---
        extractor = Extractor(extracted_text)
        parsed_data = extractor.extract_all()
        
        _, buffer = cv2.imencode('.jpg', debug_output_img)
        debug_base64 = base64.b64encode(buffer).decode('utf-8')

        print(json.dumps({
            "status": "success",
            "receipt_type_used": receipt_type,
            "extracted_text": extracted_text,
            "parsed_data": parsed_data,
            "debug_image": debug_base64
        }, ensure_ascii=False))
        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))

if __name__ == "__main__":
    process_ocr()