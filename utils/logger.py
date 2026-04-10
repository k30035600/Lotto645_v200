# -*- coding: utf-8 -*-
"""
로깅 설정 모듈
서버 로그를 파일과 콘솔에 동시 출력
"""
import logging
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

# 로그 디렉토리 생성
LOG_DIR = Path(__file__).resolve().parent.parent / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# 로그 파일 경로
LOG_FILE = LOG_DIR / 'server.log'
ERROR_LOG_FILE = LOG_DIR / 'error.log'

def setup_logging(log_level=logging.INFO):
    """
    로깅 시스템 설정
    
    Args:
        log_level: 로그 레벨 (기본값: INFO)
    
    Returns:
        logging.Logger: 설정된 로거
    """
    # 루트 로거 설정
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # 기존 핸들러 제거 (중복 방지)
    logger.handlers.clear()
    
    # 포맷 설정
    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # 파일 핸들러 (일반 로그)
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # 파일 핸들러 (에러 로그)
    error_handler = RotatingFileHandler(
        ERROR_LOG_FILE,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)
    
    return logger

def get_logger(name):
    """
    모듈별 로거 가져오기
    
    Args:
        name: 로거 이름 (보통 __name__)
    
    Returns:
        logging.Logger: 로거 인스턴스
    """
    return logging.getLogger(name)

# 로깅 시스템 초기화
setup_logging()
