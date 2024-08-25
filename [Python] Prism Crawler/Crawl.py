import os
import time
import csv
import requests
import pandas as pd
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# Selenium setup
options = webdriver.ChromeOptions()
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
# Use the installed chromedriver
driver = webdriver.Chrome(options=options) 

# 대상 URL로 이동
driver.get("https://www.prism.go.kr/homepage/organtheme/retrieveOrganthemeList.do?menuNo=I0000003")

# 필터링 조건 입력
driver.find_element(By.ID, "researchStartDate").send_keys("2023")
driver.find_element(By.ID, "organName").send_keys("고용노동부")

# 검색 버튼 클릭
search_button = driver.find_element(By.CLASS_NAME, "btn_inquiry")
search_button.click()

# 테이블 데이터를 담을 리스트
data = []
detail_data = []
detail_headers = ['과제명', '기관명', '담당부서', '전화번호', '연구기간', '연구분야', '과제개요', '수행기관', '수행연구원', '계약일자', '계약방식', '계약금액']
detail_data.append(detail_headers)

# 현재 페이지를 1로 초기화
current_page = 1

# 저장할 파일 경로
save_folder = '[Python] Prism Crawler\Report'

while True:
    # 테이블 가져오기
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "CI-GRID-WRAPPER")))
    soup = BeautifulSoup(driver.page_source, 'html.parser')

    # 페이지 소스를 가져와서 BeautifulSoup으로 파싱
    soup = BeautifulSoup(driver.page_source, 'html.parser')

    # 페이지 번호 링크의 개수 확인 (즉, "CI-GRID-PAGING-A" 클래스 요소 개수 확인)
    pagination_links = soup.find_all(class_="CI-GRID-PAGING-A")
    total_pages = len(pagination_links)

    # 1페이지부터 마지막 페이지까지 순차적으로 이동하며 데이터를 크롤링
    for page in range(1, total_pages + 1):
        # 현재 페이지가 로드될 때까지 기다림
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "CI-GRID-BODY-TABLE-TBODY"))
        )
        
        # 페이지의 소스 가져오기
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # 헤더 타이틀 읽기 (첫 번째 유효한 페이지에서만 수행)
        if not data:
            header_elements = soup.find_all(class_="CI-GRID-HEADER-TITLE")
            headers = []
            for element in header_elements:
                title_text = element.get_text(strip=True)
                headers.append(title_text)
            data.append(headers)  # 헤더를 첫 번째 행으로 추가

            detail_headers = []
        
        # 테이블 바디에서 데이터 읽기
        body_elements = soup.find_all(class_="CI-GRID-BODY-TABLE-TBODY")
        for body in body_elements:
            rows = body.find_all("tr")
            for row in rows:
                row_data = []
                cells = row.find_all("td")
                for cell in cells:
                    cell_text = cell.get_text(strip=True)
                    row_data.append(cell_text)
                data.append(row_data)

                # tr 태그를 클릭하여 세부 페이지로 이동
                try:
                    # 과제Id 추출 (세부 페이지 URL 생성을 위한)
                    research_id = row.find('td', {'data-name': 'researchId'}).get_text(strip=True)

                    # 세부 페이지로 이동하기 위해 URL 생성
                    detail_url = f"https://www.prism.go.kr/homepage/entire/researchDetail.do?researchId={research_id}&menuNo=I0000003&gubun=organtheme"
                    driver.get(detail_url)
                    
                    # 세부 페이지에서 정보 추출
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "tit_h3")))
                    
                    # 페이지 전환을 위해 잠시 대기
                    time.sleep(2)
                    
                    detail_soup = BeautifulSoup(driver.page_source, 'html.parser')
                    h3_elements = detail_soup.find_all('h3', class_='tit_h3')

                    detail_row = []
                    for h3 in h3_elements:
                        title = h3.get_text(strip=True)
                        if title in ["과제정보", "계약정보"]:
                            detail_body = h3.find_next_sibling('div')
                            if detail_body:
                                for row in detail_body.find_all('tr'):
                                    td_elements = row.find_all('td')
                                    for td in td_elements:
                                        td_text = td.get_text(strip=True)
                                        detail_row.append(td_text)
                    detail_data.append(detail_row)

                    # 연구결과 평가 및 활용보고서에서 파일 링크 다운로드
                    result_section = detail_soup.find('h3', text='연구결과정보')
                    if result_section:
                        result_div = result_section.find_next_sibling('div')
                        file_links = result_div.find_all('a', href=True)

                        file_index = 0
                        for file_link in file_links:
                            file_url = "https://www.prism.go.kr"+file_link['href']
                            if file_url:
                                # 파일 확장자 추출
                                file_text = file_link.get_text(strip=True)
                                file_ext = file_text.split('.')[-1] if '.' in file_url else ''

                                if file_index == 0:
                                    file_name = f"{row_data[5]}_{row_data[2]}.{file_ext}"  # 과제명으로 파일 이름 설정
                                    file_index += 1
                                else:
                                    file_name = f"{row_data[5]}_{row_data[2]}_{file_index}.{file_ext}"  # 과제명으로 파일 이름 설정
                                    file_index += 1

                                # 저장할 파일 경로
                                file_path = os.path.join(save_folder, file_name)

                                # 파일 다운로드
#                                response = requests.get(file_url, stream=True)
#                                with open(file_path, 'wb') as file:
#                                    for chunk in response.iter_content(chunk_size=8192):
#                                        file.write(chunk)
#                                print(f"파일 다운로드 완료: {file_name}")

                    # 원래 페이지로 돌아오기
                    driver.back()
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "CI-GRID-WRAPPER")))
                except Exception as e:
                    print(f"세부 페이지 이동 중 오류 발생: {e}")
                    driver.back()
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "CI-GRID-WRAPPER")))
      
        
        # 다음 페이지로 이동
        current_page += 1
        if page < total_pages:           
            next_page = driver.find_element(By.XPATH, f"//a[@title='{current_page} 페이지 이동']")
            next_page.click()
            
            # 페이지 전환을 위해 잠시 대기
            time.sleep(2)
    
    # 다음 10페이지로 이동할 수 있는 버튼이 활성화되어 있는지 확인
    try:
        next_pages_button = soup.find_element(By.CLASS_NAME, "CI-GRID-PAGING-RIGHT")
        next_pages_button.click()  # 다음 10페이지로 이동
        time.sleep(2)
    except:
        print("다음 10페이지 버튼이 없습니다. 종료합니다.")
        break  # "다음 10페이지" 버튼이 없는 경우 크롤링 종료

# 모든 페이지 크롤링이 끝난 후 WebDriver 종료
driver.quit()

# data를 CSV 파일로 저장
with open('[Python] Prism Crawler\output.csv', 'w', newline='', encoding='cp949') as file:
    writer = csv.writer(file)
    for row in data:
        cleaned_row = [cell.replace('\xa0', '') for cell in row]
        writer.writerow(cleaned_row)

# detail_data를 CSV 파일로 저장
with open('[Python] Prism Crawler\detail_output.csv', 'w', newline='', encoding='cp949') as file:
    writer = csv.writer(file)
    for row in detail_data:
        cleaned_row = [cell.replace('\xa0', '') for cell in row]
        writer.writerow(cleaned_row)        



