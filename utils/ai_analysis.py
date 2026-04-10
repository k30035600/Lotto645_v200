# -*- coding: utf-8 -*-
"""
AI 분석 모듈 (Gemini API)
- 로또 번호 패턴 분석 및 질의응답 처리
"""
import os
from google import genai
from utils.logger import get_logger

# 로거 설정
logger = get_logger(__name__)

def analyze_lotto_patterns(history_text, user_question, api_key):
    """
    Gemini API를 사용하여 로또 번호 패턴을 분석하고 사용자 질문에 답변합니다.
    
    Args:
        history_text (str): 분석할 로또 당첨번호 이력 텍스트
        user_question (str): 사용자 질문
        api_key (str): Google Gemini API Key
        
    Returns:
        str: AI 답변 텍스트
        
    Raises:
        Exception: API 호출 실패 시 예외 발생
    """
    if not api_key:
        raise ValueError("API 키가 설정되지 않았습니다.")

    genai.configure(api_key=api_key)

    prompt = f"""
당신은 로또 번호 분석 전문가입니다. 다음 데이터를 바탕으로 사용자의 질문에 답변해주세요.
모든 답변은 항상 한국어로 작성해주세요.
{history_text}

사용자 질문: {user_question}

답변은 친절하고 전문적으로, 그리고 확률적 근거(홀짝, 번호대, 미출현 번호 등)를 들어 설명해주세요.
답변 끝에는 "이 분석은 참고용이며, 당첨을 보장하지 않습니다."라는 문구를 추가해주세요.
"""

    # 시도할 모델 리스트 (최신순)
    # 'latest' 태그를 사용하면 Google이 안정적인 최신 버전을 자동으로 선택해줍니다.
    models_to_try = [
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
    ]
    
    errors = []

    for model_name in models_to_try:
        try:
            logger.info(f'[Gemini API] Trying model: {model_name}')
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            
            if response and response.text:
                logger.info(f"[Gemini API] Successfully generated content with {model_name}.")
                return response.text
            else:
                error_msg = f"{model_name}: Empty response"
                logger.warning(f"[Gemini API] {error_msg}")
                errors.append(error_msg)

        except Exception as e:
            last_error = str(e)
            error_msg = f"{model_name}: {last_error}"
            logger.error(f"[Gemini API] Error with model {error_msg}", exc_info=True)
            errors.append(error_msg)
            
            # API 키 또는 권한 오류 시 즉시 중단
            if 'API_KEY_INVALID' in last_error or 'permission_denied' in last_error.lower():
                raise Exception(f"API 키가 올바르지 않거나 권한이 없습니다: {last_error[:100]}")
            
            # 할당량 초과 시 다음 모델 시도
            if 'resource_exhausted' in last_error.lower() or 'quota' in last_error.lower():
                logger.warning(f"[Gemini API] Quota exceeded for {model_name}, trying next model.")
            continue
    
    # 모든 모델 시도 후 실패 시
    error_summary = "; ".join(errors)
    raise Exception(f"모든 AI 모델 호출에 실패했습니다. (상세: {error_summary[:200]}...)")
