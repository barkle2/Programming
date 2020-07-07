import tkinter as tk
import time

num_list=['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '=']
op_list = ['*', '/', '+', '-', '(', ')', 'C', 'AC']

# num_list와 op_list를 합친 key_list 생성
key_list = num_list + op_list

# key_list에서 =, C, AC 를 제거
key_list.remove('AC')
key_list.remove('C')
key_list.remove('=')


# 키보드 입력시 실행되는 함수
def inputKey(key):
    # display를 입력 가능한 상태로 전환
    display.configure(state=tk.NORMAL)
    
    # 입력된 키가 key_list에 있는 키인 경우
    if key.char in key_list:
        # display_entry에 입력된 키 값을 추가
        display.insert(tk.END, key.char)
    # 입력된 키가 '=' 또는 엔터인 경우
    elif key.char == '=' or key.char == '\r':
        try:
            # 결과 값을 계산
            result = str(round(eval(display.get()), 2))
            # 메인 디스플레이를 지우고
            display.delete(0, tk.END)
            # 결과 값을 추가합니다.
            display.insert(tk.END, result)
        except:
            # 현재 display 수식을 임시로 저장
            result_tmp = display.get()
            # display 에 내용을 지웁니다
            display.delete(0, tk.END)
            # 안내 메시지를 표출
            display.insert(0, "계산할 수 없는 수식입니다")
            display.update()
            # 1초간 정지
            time.sleep(1)
            # display 내용을 지웁니다.
            display.delete(0, tk.END)
            # 임시로 저장해두었던 수식을 다시 보여주기
            display.insert(0, result_tmp)
    # 입력된 키가 'C'인 경우
    elif key.char == 'C' or key.char == 'c':
        # display 내용을 삭제
        display.delete(0, tk.END)
    # 입력된 키가 'A'인 경우
    elif key.char == 'A' or key.char == 'a':
        # display 내용을 삭제
        display.delete(0, tk.END)
        # 클립보드 1,2,3의 내용도 삭제
        clip1_entry.delete(0, tk.END)
        clip2_entry.delete(0, tk.END)
        clip3_entry.delete(0, tk.END)

    # BackSpace 키를 누른 경우
    if key.keysym == "BackSpace":
        # 현재 display_entry 글자 수를 구해서
        display_len = len(display.get())
        # 마지막 글자만 지운다
        display.delete(display_len-1, tk.END)
    
    # F1 키를 누른 경우
    if key.keysym == 'F1':
        # 클립보드1의 내용을 삭제
        clip1_entry.delete(0, tk.END)
        # display Entry의 내용을 클립보드 1로 복사
        clip1_entry.insert(tk.END, display.get())
    # F2 키를 누른 경우
    elif key.keysym == 'F2':
        # 클립보드2의 내용을 삭제
        clip2_entry.delete(0, tk.END)
        # display Entry의 내용을 클립보드 2로 복사
        clip2_entry.insert(tk.END, display.get())
    # F3 키를 누른 경우
    elif key.keysym == 'F3':
        # 클립보드3의 내용을 삭제
        clip3_entry.delete(0, tk.END)
        # display Entry의 내용을 클립보드 3로 복사
        clip3_entry.insert(tk.END, display.get())
    # F4 키를 누른 경우
    elif key.keysym == 'F4':
        # 클립보드1의 내용을 display에 추가
        display.insert(tk.END, clip1_entry.get())
        # 클립보드1의 내용 삭제
        clip1_entry.delete(0, tk.END)
    # F5 키를 누른 경우
    elif key.keysym == 'F5':
        # 클립보드2의 내용을 display에 추가
        display.insert(tk.END, clip2_entry.get())
        # 클립보드2의 내용 삭제
        clip2_entry.delete(0, tk.END)
    # F6 키를 누른 경우
    elif key.keysym == 'F6':
        # 클립보드3의 내용을 display에 추가
        display.insert(tk.END, clip3_entry.get())
        # 클립보드3의 내용 삭제
        clip3_entry.delete(0, tk.END)

    # display를 입력 불가능한 상태로 전환
    display.configure(state="readonly")
            

def click(text):
    # display를 입력 가능한 상태로 전환
    display.configure(state=tk.NORMAL)
    
    # text 값이 =인 경우
    if text == "=":
        try:
            # 결과 값을 계산
            result = str(round(eval(display.get()), 2))
            # 메인 디스플레이를 지우고
            display.delete(0, tk.END)
            # 결과 값을 추가합니다.
            display.insert(tk.END, result)
        except:
            display.insert(tk.END, "->오류")
    # text 값이 C인 경우
    elif text == "C":
        # 메인 디스플레이를 지웁니다.
        display.delete(0, tk.END)
    elif text == "AC":
        # 메인 디스플레이를 지웁니다.
        display.delete(0, tk.END)
    else:
        # 그 외의 버튼을 누르면 그 버튼의 Text 값을 Entry에 출력
        display.insert(tk.END, text)

    # display를 입력 불가능한 상태로 전환
    display.configure(state="readonly")

# F1~F6 키를 눌렀을 때 실행되는 함수
def funcClick(key):
    # display를 입력 가능한 상태로 전환
    display.configure(state=tk.NORMAL)
    
    # F1 키를 누른 경우
    if key == 'F1':
        # 클립보드1의 내용을 삭제
        clip1_entry.delete(0, tk.END)
        # display Entry의 내용을 클립보드 1로 복사
        clip1_entry.insert(tk.END, display.get())
    elif key == 'F2':
        # 클립보드2의 내용을 삭제
        clip2_entry.delete(0, tk.END)
        # display Entry의 내용을 클립보드 2로 복사
        clip2_entry.insert(tk.END, display.get())
    elif key == 'F3':
        # 클립보드3의 내용을 삭제
        clip3_entry.delete(0, tk.END)
        # display Entry의 내용을 클립보드 3로 복사
        clip3_entry.insert(tk.END, display.get())
    elif key == 'F4':
        # 클립보드1의 내용을 display에 추가
        display.insert(tk.END, clip1_entry.get())
        # 클립보드1의 내용 삭제
        clip1_entry.delete(0, tk.END)
    elif key == 'F5':
        # 클립보드2의 내용을 display에 추가
        display.insert(tk.END, clip2_entry.get())
        # 클립보드2의 내용 삭제
        clip2_entry.delete(0, tk.END)
    elif key == 'F6':
        # 클립보드3의 내용을 display에 추가
        display.insert(tk.END, clip3_entry.get())
        # 클립보드3의 내용 삭제
        clip3_entry.delete(0, tk.END)

    # display를 입력 불가능한 상태로 전환
    display.configure(state="readonly")
    
# 윈도우 생성
window = tk.Tk()
window.title("CB_CALC")
# 메인 윈도우를 항상 위로
window.attributes("-topmost", True)

# focus-on 상태에서 키를 누르면 inputKey 함수 실행
window.bind("<Key>", inputKey)

# 디스플레이 생성
display = tk.Entry(window, width=35, readonlybackground="light green", bg="light green")
display.grid(row=0, column=0, columnspan=2)
display.configure(state="readonly")

# 숫자 버튼을 넣을 프레임
num_frame = tk.Frame(window)
num_frame.grid(row=1, column=0)

# 숫자 버튼을 넣어봅시다.
r = 0
c = 0

for btn_text in num_list:
    def cmd(x=btn_text):
        click(x)
    tk.Button(num_frame, text=btn_text, width=5, command=cmd).grid(row=r, column=c)
    c = c+1
    if c>2:
        c=0
        r=r+1
        
# 연산자 버튼을 넣을 프레임
op_frame = tk.Frame(window)
op_frame.grid(row=1, column=1)

# 연산자 버튼을 넣어봅시다.
r = 0
c = 0

for btn_text in op_list:
    def cmd(x=btn_text):
        click(x)
    tk.Button(op_frame, text=btn_text, width=5, command=cmd).grid(row=r, column=c)
    c=c+1
    if c>1:
        c=0
        r=r+1

# 클립보드 프레임 생성 및 배치
clip_frame = tk.Frame(window)
clip_frame.grid(row=2, column=0, columnspan=2, sticky='N')

# F1~F6 를 눌렀을 때 실행되는 함수
def cmd_F1():
    # 단순히 funcClick을 호출
    funcClick('F1')

def cmd_F2():
    # 단순히 funcClick을 호출
    funcClick('F2')

def cmd_F3():
    # 단순히 funcClick을 호출
    funcClick('F3')

def cmd_F4():
    # 단순히 funcClick을 호출
    funcClick('F4')

def cmd_F5():
    # 단순히 funcClick을 호출
    funcClick('F5')

def cmd_F6():
    # 단순히 funcClick을 호출
    funcClick('F6')

# 클립보드1 입출력 버튼, 엔트리 생성 및 배치
clip1_input_btn = tk.Button(clip_frame, width=2, text="F1", command=cmd_F1)
clip1_input_btn.grid(row=0, column=0)
clip1_entry = tk.Entry(clip_frame, width=20, bg="light pink")
clip1_entry.grid(row=0, column=1)
clip1_output_btn = tk.Button(clip_frame, width=2, text="F4", command=cmd_F4)
clip1_output_btn.grid(row=0, column=2)

# 클립보드2 입출력 버튼, 엔트리 생성 및 배치
clip2_input_btn = tk.Button(clip_frame, width=2, text="F2", command=cmd_F2)
clip2_input_btn.grid(row=1, column=0)
clip2_entry = tk.Entry(clip_frame, width=20, bg="light blue")
clip2_entry.grid(row=1, column=1)
clip2_output_btn = tk.Button(clip_frame, width=2, text="F5", command=cmd_F5)
clip2_output_btn.grid(row=1, column=2)

# 클립보드3 입출력 버튼, 엔트리 생성 및 배치
clip3_input_btn = tk.Button(clip_frame, width=2, text="F3", command=cmd_F3)
clip3_input_btn.grid(row=2, column=0)
clip3_entry = tk.Entry(clip_frame, width=20, bg="light green")
clip3_entry.grid(row=2, column=1)
clip3_output_btn = tk.Button(clip_frame, width=2, text="F6", command=cmd_F6)
clip3_output_btn.grid(row=2, column=2)




















