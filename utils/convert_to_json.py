
import json
import os
import openpyxl

def _convert_file(xlsx_path, json_path):
    """Helper to convert a single XLSX file to JSON."""
    if not os.path.exists(xlsx_path):
        print(f"파일 없음, 건너뛰기: {os.path.basename(xlsx_path)}")
        return

    try:
        wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if len(rows) > 1:
            header = [str(h) if h is not None else '' for h in rows[0]]
            data = []
            for row in rows[1:]:
                item = {}
                for i, h in enumerate(header):
                    if h:
                        val = row[i]
                        # 날짜 객체는 YYYY-MM-DD 형식의 문자열로 변환
                        if hasattr(val, 'strftime'):
                            val = val.strftime('%Y-%m-%d')
                        item[h] = val
                data.append(item)
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"변환 완료: {os.path.basename(json_path)} ({len(data)}건)")
        wb.close()
    except Exception as e:
        print(f"{os.path.basename(xlsx_path)} 변환 실패: {e}")

def convert_xlsx_to_json():
    """Lotto645만 XLSX → JSON 변환 (Lotto023은 XLSX 직접 사용)."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_dir = os.path.join(base_dir, '.source')
    
    _convert_file(os.path.join(source_dir, 'Lotto645.xlsx'), os.path.join(source_dir, 'Lotto645.json'))

if __name__ == '__main__':
    convert_xlsx_to_json()
