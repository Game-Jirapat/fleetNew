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
            # --- ส่วนที่ 1: ตีกรอบตาม Keywords เดิม ---
            target_keywords = {'ทะเบียน': (0, 255, 0), 'ผู้เสียภาษี': (0, 0, 255)} 
            for i in range(n_boxes):
                if int(d['conf'][i]) > 30:
                    text = d['text'][i]
                    for key, color in target_keywords.items():
                        if key in text:
                            (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                            cv2.rectangle(debug_output_img, (x-5, y-5), (x+w+150, y+h+10), color, 2)
            
            # --- ส่วนที่ 2: ตีกรอบมุมขวาบน (Fixed Position) ---
            # ดึงขนาดรูปภาพปัจจุบัน
            h_img, w_img = debug_output_img.shape[:2]

            # 🟦 1. กรอบสีน้ำเงิน (ขวาบน) - ประเภทใบเสร็จ / เลขที่ใบเสร็จ
            # เริ่มประมาณ x=65% ถึงขอบขวา, y=0% ถึง 20%
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.65), int(h_img * 0.02)), 
                         (int(w_img * 0.98), int(h_img * 0.22)), (255, 0, 0), 3)

            # 🟥 2. กรอบสีแดง (กลางบน) - ข้อมูลลูกค้า (กฟผ.)
            # เริ่มประมาณ x=0% ถึง 60%, y=18% ถึง 35%
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.02), int(h_img * 0.18)), 
                         (int(w_img * 0.60), int(h_img * 0.50)), (0, 0, 255), 3)

            # 🟩 3. กรอบสีเขียว (กลางซ้าย) - ทะเบียนรถ
            # เริ่มประมาณ x=0% ถึง 25%, y=35% ถึง 45%
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.02), int(h_img * 0.30)), 
                         (int(w_img * 0.25), int(h_img * 0.45)), (0, 255, 0), 3)

            # 🟪 4. กรอบสีม่วง (ซ้ายล่าง) - ลายเซ็น / ข้อความรับสินค้า
            # เริ่มประมาณ x=0% ถึง 48%, y=75% ถึง 100%
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.02), int(h_img * 0.75)), 
                         (int(w_img * 0.48), int(h_img * 0.98)), (255, 0, 255), 3)

            # 🟧 5. กรอบสีส้ม (ขวาล่าง) - พื้นที่ว่างขวาล่าง
            # เริ่มประมาณ x=48% ถึงขอบขวา, y=75% ถึง 100%
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.48), int(h_img * 0.75)), 
                         (int(w_img * 0.98), int(h_img * 0.98)), (0, 165, 255), 3)
            
            # 🟦 6. กรอบcyan (ขวากลาง) - วันที่
            # เริ่มประมาณ x=48% ถึงขอบขวา, y=75% ถึง 100%
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.48), int(h_img * 0.25)), 
                         (int(w_img * 0.98), int(h_img * 0.50)), (255, 255, 0), 3)
            
        elif receipt_type == "2":
            # 📝 โครงสำหรับการตีกรอบแบบที่ 2 (เช่น Thermal Slip)
            # แยกเงื่อนไขหรือ Keywords ต่างกันได้ที่นี่
            target_keywords = {'ELECTRICITY': (255, 0, 0), 'TAX ID': (255, 165, 0)}
            for i in range(n_boxes):
                if int(d['conf'][i]) > 30:
                    text = d['text'][i]
                    for key, color in target_keywords.items():
                        if key in text:
                            (x, y, w, h) = (d['left'][i], d['top'][i], d['width'][i], d['height'][i])
                            # ตัวอย่าง: แบบที่ 2 อาจจะตีกรอบกว้างกว่า
                            cv2.rectangle(debug_output_img, (x-10, y-10), (x+w+300, y+h+20), color, 3)
                            
            h_img, w_img = debug_output_img.shape[:2]

            # 🟦 1. กรอบสีน้ำเงิน (กลางบน) - หัวข้อ TAX INVOICE / ผู้ขาย
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.02), int(h_img * 0.50)), 
                         (int(w_img * 0.98), int(h_img * 0.60)), (255, 0, 0), 3)

            # 🟥 2. กรอบสีแดง (กลางล่าง) - ยอดรวม และ ทะเบียนรถ (Plate No)
            cv2.rectangle(debug_output_img,
                         (int(w_img * 0.02), int(h_img * 0.76)), 
                         (int(w_img * 0.98), int(h_img * 0.79)), (0, 0, 255), 3)

            # 🟩 3. กรอบสีเขียว (ล่างสุด) - ข้อมูลลูกค้า (กฟผ.) / ที่อยู่ และเลขภาษี
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.02), int(h_img * 0.80)), 
                         (int(w_img * 0.98), int(h_img * 0.98)), (0, 255, 0), 3)
            
            # 🟩 4. กรอบ(วันที่) - วันที่
            cv2.rectangle(debug_output_img, 
                         (int(w_img * 0.02), int(h_img * 0.61)), 
                         (int(w_img * 0.98), int(h_img * 0.75)), (0, 255, 255), 3)
            
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