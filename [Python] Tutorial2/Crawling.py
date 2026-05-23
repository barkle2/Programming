from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import openpyxl

# 브라우저를 숨겨서 실행
options = webdriver.ChromeOptions()
options.add_argument("--headless")
driver = webdriver.Chrome(options=options)

# Chrome 브라우저 실행
# driver = webdriver.Chrome()

# 고용노동부 보도자료 웹페이지
url = "https://moel.go.kr/news/enews/report/enewsList.do"
driver.get(url)

# 엑셀 파일 생성 및 시트 추가
wb = openpyxl.Workbook()
ws = wb.active

# 페이지 이동 후 다음 페이지로 이동하면서 데이터 크롤링
current_page = 1

while True:
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "tbl")))
    
    # HTML 파일을 읽고 파싱
    html = driver.page_source
    soup = BeautifulSoup(html, 'html.parser')

    # 파싱한 페이지에서 테이블을 읽는다
    table = soup.find('table', class_='tbl type_1 b_list')

    # 테이블이 있는 경우
    if table:
        # 'tr' 태그로 rows를 찾고
        rows = table.find_all('tr')
        # 각각의 row마다 작업 수행
        for row in rows:
            # 'td' 태그로 cols를 찾고
            cols = row.find_all('td')
            row_data = []

            if len(cols) > 0 :
                # 연번
                col1 = cols[0]                
                row_data.append(col1.get_text())
                # 제목
                col2 = cols[1]
                row_data.append(col2.get_text())


                # 첨부파일
                col3 = cols[2]
                row_data.append(col3.get_text())
                # 날짜
                col4 = cols[3]
                row_data.append(col4.get_text())
                # 조회수
                col5 = cols[4]
                row_data.append(col5.get_text())

                a_tag = col2.find('a')
                target_href = a_tag['href']         

                title_link = driver.find_element(By.XPATH, f'//a[@href="{target_href}"]')
                title_link.click()

                # "b_content" 클래스를 가진 요소의 텍스트를 추출하여 엑셀 파일에 추가
                content_element = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "b_content")))
                content_text = content_element.text.strip()
                row_data.append(content_text)

                driver.back()

            if row_data:
                ws.append(row_data)            

        # 다음 페이지로 이동하기 위해 숫자 버튼 클릭
        current_page += 1
        try:
            next_button = driver.find_element(By.LINK_TEXT, str(current_page))
        except Exception:
            next_button = driver.find_element(By.XPATH, '//img[@alt="다음으로"]')

        if not next_button.get_attribute('disabled'):
            next_button.click()
        else:
            print("No more pages")
            break  # 더 이상 다음 페이지가 없으면 종료

    if current_page == 235:
        break

# 워크북을 output.xlsx로 저장
wb.save('output.xlsx')

driver.quit()  # 브라우저 종료


