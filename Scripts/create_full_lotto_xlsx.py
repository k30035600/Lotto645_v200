
import os
import time
import sys
from pathlib import Path
# 상위 디렉터리를 sys.path에 추가하여 utils 패키지를 찾을 수 있게 함
sys.path.append(str(Path(__file__).resolve().parent.parent))

import openpyxl
from utils.get_lotto_round import get_lotto_number, get_latest_round_no

# 저장 경로
SOURCE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'source')
XLSX_PATH = os.path.join(SOURCE_DIR, 'Lotto645_new.xlsx')

def create_full_lotto645_xlsx():
    # 1. 최신 회차 조회
    print("최신 회차 정보를 조회합니다...")
    latest_round = get_latest_round_no()
    if not latest_round:
        latest_round = 1210 # 실패 시 하드코딩된 값 사용
        print(f"최신 회차 조회 실패. 기본값({latest_round}회)으로 진행합니다.")
    else:
        print(f"최신 회차: {latest_round}회")

    # 2. 엑셀 워크북 생성 및 헤더 설정
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Lotto645"
    
    # 헤더 (Lotto645.xlsx 표준 형식 + 확장 정보)
    headers = [
        '회차', '날짜', 
        '번호1', '번호2', '번호3', '번호4', '번호5', '번호6', '보너스번호',
        '1등 당첨금액', '1등 당첨자 수', '1등 총당첨금액', '전체 당첨상금 총액'
    ]
    ws.append(headers)

    print(f"1회부터 {latest_round}회까지 데이터 수집을 시작합니다. (예상 소요 시간: 약 {latest_round * 0.2 / 60:.1f}분)")
    
    # 실패한 회차 기록
    failed_rounds = []
    
    # 3. 데이터 수집 루프 (최신 회차부터 역순으로 저장하여 나중에 정렬 필요 없음)
    # 하지만 엑셀은 행 추가 방식이므로 1회부터 순서대로 넣고 마지막에 역순 정렬하거나,
    # insert_rows를 쓰는데, 대량 데이터는 append가 빠르므로 1회부터 수집 후 역순 정렬 권장.
    # 사용자가 '최신 회차가 위로' 오길 원하므로, 데이터를 모은 뒤 역순으로 엑셀에 씁니다.
    
    all_data = []

    for round_no in range(1, latest_round + 1):
        try:
            # 50회마다 진행 상황 출력
            if round_no % 50 == 0:
                print(f"진행 중... ({round_no}/{latest_round}회)")
            
            # 100회마다 잠시 휴식 (차단 방지)
            if round_no % 100 == 0:
                time.sleep(1)

            data = get_lotto_number(round_no)
            if data:
                # 데이터 포맷팅
                row = [
                    data['drwNo'],
                    data['date'],
                    data['numbers'][0], data['numbers'][1], data['numbers'][2],
                    data['numbers'][3], data['numbers'][4], data['numbers'][5],
                    data['bonus'],
                    data.get('firstWinamnt', 0),
                    data.get('firstPrzwnerCo', 0),
                    data.get('firstAccumamnt', 0),
                    data.get('totSellamnt', 0)
                ]
                all_data.append(row)
            else:
                print(f"[경고] {round_no}회 데이터 조회 실패")
                failed_rounds.append(round_no)
                
        except Exception as e:
            print(f"[오류] {round_no}회 처리 중 예외 발생: {e}")
            failed_rounds.append(round_no)
            time.sleep(2) # 오류 발생 시 조금 더 대기

    # 4. 엑셀에 데이터 쓰기 (회차 내림차순 정렬: 최신 회차가 2행에 오도록)
    print("데이터 수집 완료. 엑셀 파일 생성 중...")
    
    # 회차 기준 내림차순 정렬
    all_data.sort(key=lambda x: x[0], reverse=True)
    
    for row in all_data:
        ws.append(row)

    # 5. 저장
    if not os.path.exists(SOURCE_DIR):
        os.makedirs(SOURCE_DIR)
        
    wb.save(XLSX_PATH)
    wb.close()
    
    print(f"\n[완료] 총 {len(all_data)}개 회차 데이터 저장됨.")
    print(f"저장 경로: {XLSX_PATH}")
    
    if failed_rounds:
        print(f"실패한 회차({len(failed_rounds)}건): {failed_rounds}")
        print("실패한 회차는 나중에 다시 시도하거나 수동으로 채워주세요.")

if __name__ == "__main__":
    create_full_lotto645_xlsx()
