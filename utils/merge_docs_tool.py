import os
import glob
import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    """docx 파일 압축을 풀고 순수 텍스트만 추출"""
    text = []
    try:
        with zipfile.ZipFile(path) as docx:
            tree = ET.XML(docx.read('word/document.xml'))
            word_uri = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
            
            for p in tree.iter(f'{word_uri}p'):
                texts = [node.text for node in p.iter(f'{word_uri}t') if node.text]
                if texts:
                    text.append(''.join(texts))
    except Exception as e:
        return f"Error reading {path}: {e}"
    return '\n\n'.join(text)

def categorize_md(filename):
    """마크다운 파일의 중요도/주제별 정렬 우선순위 부과"""
    lower = filename.lower()
    if 'spec' in lower or 'guide' in lower or 'architecture' in lower:
        return 1
    elif 'formula' in lower or 'calculation' in lower or 'analysis' in lower or 'impact' in lower:
        return 2
    elif 'deploy' in lower or 'git' in lower:
        return 3
    else:
        return 4

def merge_docx_files():
    """readme 경로 등의 docx 파일들을 하나로 병합 (통합_프로젝트_문서.md)"""
    docx_files = glob.glob('readme/**/*.docx', recursive=True)
    if not docx_files:
        print("[DOCX 병합] 처리할 .docx 파일이 없습니다.")
        return
        
    output = '통합_프로젝트_문서.md'
    with open(output, 'w', encoding='utf-8') as out:
        out.write("# 📚 Lotto_v200 프로젝트 통합 문서\n\n")
        out.write("> 분산된 여러 `.docx` 파일들을 추출하여 하나로 병합한 최종본입니다.\n\n---\n\n")
        
        for file_path in docx_files:
            filename = os.path.basename(file_path)
            content = get_docx_text(file_path)
            out.write(f"## 📎 {filename}\n\n{content}\n\n---\n\n")
            # 선택적 다이어트: os.remove(file_path)
    print(f"[DOCX 병합 완료] {output} 생성 완료")

def merge_md_files():
    """docs 경로 등의 md 파일들을 하나로 병합 (통합_기술문서.md)"""
    md_files = glob.glob('docs/*.md')
    if not md_files:
        print("[MD 병합] 처리할 .md 파일이 없습니다.")
        return
        
    md_files.sort(key=lambda x: (categorize_md(os.path.basename(x)), x))
    
    output = '통합_기술문서.md'
    with open(output, 'w', encoding='utf-8') as out:
        out.write("# 🔬 Lotto_v200 통합 기술문서\n\n")
        out.write("> 알고리즘 공식, 아키텍처 가이드, 배포 방법론 등을 단일 파일로 정리한 백과사전입니다.\n\n---\n\n")
        
        for file_path in md_files:
            filename = os.path.basename(file_path)
            if '-초록마을' in filename and filename != 'QUALITY_REPORT_ROLLING.md':
                continue # 중복 백업본 패스
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                out.write(f"## 📄 {filename}\n\n{content}\n\n---\n\n")
                # 선택적 다이어트: os.remove(file_path)
            except Exception as e:
                print(f"[MD 오류] {filename} 읽기 실패: {e}")
                
    print(f"[MD 병합 완료] {output} 생성 완료")

if __name__ == '__main__':
    print("=== 프로젝트 문서 통합 및 다이어트 유틸리티 ===")
    merge_docx_files()
    merge_md_files()
    print("모든 통합 작업이 성공적으로 처리되었습니다.")
