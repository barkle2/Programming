# Tkinter 라이브러리 호출
import tkinter as tk

# 버튼 클릭시 실행 함수
def button_click(key):
    # '=' 버튼을 누른 경우
    if key == '=':
        # display_entry 수식을 계산하고 결과값 출력
        result = str(round(eval(display_entry.get()),2))
        display_entry.insert(tk.END, '=' + result)
    # 'C' 버튼을 누른 경우
    elif key == 'C':
        # display_entry 내용 삭제
        display_entry.delete(0, tk.END)
    # 'AC' 버튼을 누른 경우
    elif key == 'AC':
        # display_entry 내용 삭제
        display_entry.delete(0, tk.END)
    # '=', 'C', 'AC' 외의 버튼을 누른 경우
    else:
        # 눌러진 버튼 텍스트 값을 디스플레이에 추가
        display_entry.insert(tk.END, key)

# 메인 윈도우 생성
main_win = tk.Tk()
# 메인 윈도우 이름 설정
main_win.title("CB_Calc")

# 디스플레이 엔트리 생성 및 배치
# columnspan=2 추가
display_entry = tk.Entry(main_win, width=45, bg="light green")
display_entry.grid(row=0, column=0, columnspan=2)

# 번호 프레임 생성 및 배치
num_frame = tk.Frame(main_win)
num_frame.grid(row=1, column=0, sticky='W')

# 넣고 싶은 번호 리스트(순서대로)
num_list = ['7', '8', '9',
            '4', '5', '6',
            '1', '2', '3',
            '0', '.', '=']

# 반복문에서 사용할 임시 변수
row_tmp = 0
col_tmp = 0

# num_text는 num_list 값을 순서대로 갖게 된다
for num_text in num_list:

    # 버튼을 눌렀을 때 cmd_tmp가 실행된다
    def cmd_tmp(key_input=num_text):
        # num_text 값을 넘겨주면서 button_click을 호출
        button_click(key_input)

    # Button을 생성하고, row_tmp, col_tmp 위치에 배치
    num_button = tk.Button(num_frame, text=num_text, width=5, command=cmd_tmp)
    num_button.grid(row=row_tmp, column=col_tmp)

    # 버튼을 배치했으면 다음 칸으로 이동하도록 col_tmp에 1 더한다
    col_tmp = col_tmp + 1
    # col_tmp가 2보다 크다면 다음 줄로 이동한다
    if col_tmp > 2:
        col_tmp = 0
        row_tmp = row_tmp + 1

# 연산자 프레임 생성 및 배치
op_frame = tk.Frame(main_win)
op_frame.grid(row=1, column=1, sticky='E')

# 넣고 싶은 연산자 리스트(순서대로)
op_list = ['*', '/',
           '+', '-',
           '(', ')',
           'C', 'AC']

# 반복문에서 사용할 임시 변수
row_tmp = 0
col_tmp = 0

# op_text는 op_list 값을 순서대로 갖게 된다
for op_text in op_list:

    # 버튼을 눌렀을 때 cmd_tmp가 실행된다
    def cmd_tmp(key_input=op_text):
        # op_text 값을 넘겨주면서 button_click을 호출
        button_click(key_input)

    # Button을 생성하고, row_tmp, col_tmp 위치에 배치
    op_button = tk.Button(op_frame, text=op_text, width=5, command=cmd_tmp)
    op_button.grid(row=row_tmp, column=col_tmp)

    # 버튼을 배치했으면 다음 칸으로 이동하도록 col_tmp에 1 더한다
    col_tmp = col_tmp + 1
    # col_tmp가 1보다 크다면 다음 줄로 이동한다
    if col_tmp > 1:
        col_tmp = 0
        row_tmp = row_tmp + 1

# 메인 윈도우 반복 명령
main_win.mainloop()