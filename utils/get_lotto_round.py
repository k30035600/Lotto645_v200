# -*- coding: utf-8 -*-
"""
특정 회차의 로또 당첨번호를 동행복권 API(selectPstLt645Info.do)로 조회하는 독립 스크립트.
사용: python get_lotto_round.py [회차번호]
     python get_lotto_round.py 1000  → 1000회 조회
     python get_lotto_round.py      → 기본 1000회 조회
"""
import sys
import ssl
import json
import urllib.request

# Windows 콘솔 출력 인코딩 설정 (한글 깨짐 방지)
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except (AttributeError, OSError):
    pass

API_URL = 'https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Referer': 'https://www.dhlottery.co.kr/',
    'Connection': 'keep-alive',
}


def get_latest_round_no():
    """
    동행복권 API(srchLtEpsd=all)로 전체 회차 목록을 받아 최신 회차 번호를 반환합니다.
    실패 시 None.
    """
    url = '%s?srchLtEpsd=all' % API_URL
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'data' in data and 'list' in data['data']:
                lst = data['data']['list']
                if lst:
                    return max((int(x.get('ltEpsd') or 0) for x in lst))
    except Exception as e:
        print('Error fetching latest round: %s' % e)
    return None


def get_lotto_number(round_no):
    """
    특정 회차(round_no)의 로또 당첨번호를 조회합니다.
    동행복권 API selectPstLt645Info.do?srchLtEpsd={회차} 사용.
    성공 시 dict 반환, 실패 시 None.
    """
    url = '%s?srchLtEpsd=%s' % (API_URL, round_no)

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))

            if 'data' in data and 'list' in data['data']:
                result_list = data['data']['list']
                if result_list:
                    # 회차별 조회 시 list의 첫 번째 요소가 해당 회차임
                    lotto = result_list[0]
                    return _parse_lotto_data(lotto)
            return None
    except Exception as e:
        print('Error fetching round %s: %s' % (round_no, e))
        return None


def get_latest_lotto():
    """
    가장 최근 회차의 로또 당첨번호를 조회합니다.
    동행복권 API (srchLtEpsd=all) 사용.
    """
    url = '%s?srchLtEpsd=all' % API_URL
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))

            if 'data' in data and 'list' in data['data']:
                lst = data['data']['list']
                if lst:
                    # ltEpsd가 가장 큰 것이 최신
                    latest = max(lst, key=lambda x: int(x.get('ltEpsd') or 0))
                    return _parse_lotto_data(latest)
            return None
    except Exception as e:
        print('Error fetching latest lotto: %s' % e)
        return None


def _parse_lotto_data(lotto):
    """API 응답 딕셔너리를 표준 포맷으로 변환"""
    raw_date = str(lotto.get('ltRflYmd', ''))
    date_fmt = '%s-%s-%s' % (raw_date[:4], raw_date[4:6], raw_date[6:8]) if len(raw_date) == 8 else raw_date
    
    return {
        'drwNo': int(lotto.get('ltEpsd', 0)),
        'date': date_fmt,
        'drwNoDate': date_fmt, # server.py 호환
        'numbers': [
            int(lotto.get('tm1WnNo', 0)), int(lotto.get('tm2WnNo', 0)),
            int(lotto.get('tm3WnNo', 0)), int(lotto.get('tm4WnNo', 0)),
            int(lotto.get('tm5WnNo', 0)), int(lotto.get('tm6WnNo', 0)),
        ],
        'main': [ # server.py 호환
            int(lotto.get('tm1WnNo', 0)), int(lotto.get('tm2WnNo', 0)),
            int(lotto.get('tm3WnNo', 0)), int(lotto.get('tm4WnNo', 0)),
            int(lotto.get('tm5WnNo', 0)), int(lotto.get('tm6WnNo', 0)),
        ],
        'bonus': int(lotto.get('bnsWnNo', 0)),
        'bnusNo': int(lotto.get('bnsWnNo', 0)), # server.py 호환
        'winnerAmt': int(lotto.get('rnk1WnAmt', 0)),
        'rnk1WnAmt': int(lotto.get('rnk1WnAmt', 0)), # server.py 호환
        
        # 추가 정보
        'firstWinamnt': int(lotto.get('rnk1WnAmt') or 0),
        'firstPrzwnerCo': int(lotto.get('rnk1WnNope') or 0),
        'firstAccumamnt': int(lotto.get('rnk1SumWnAmt') or 0),
        'totSellamnt': int(lotto.get('wholEpsdSumNtslAmt') or 0),
        'source': '동행복권 내부 API'
    }


if __name__ == '__main__':
    round_no = 1000
    if len(sys.argv) > 1:
        try:
            round_no = int(sys.argv[1])
        except ValueError:
            print('회차는 숫자로 입력하세요. 예: python get_lotto_round.py 1000')
            sys.exit(1)

    result = get_lotto_number(round_no)
    if result:
        amt = result.get('winnerAmt')
        if amt is None:
            amt_str = '(없음)'
        else:
            try:
                amt_str = '%s원' % format(int(amt), ',')
            except (TypeError, ValueError):
                amt_str = str(amt)
        print('== %s회 당첨번호 (%s) ==' % (result['drwNo'], result['date']))
        print('번호: %s + 보너스 %s' % (result['numbers'], result['bonus']))
        print('1등 당첨금: %s' % amt_str)
    else:
        print('해당 회차(%s) 정보를 가져오지 못했습니다.' % round_no)
        sys.exit(1)
