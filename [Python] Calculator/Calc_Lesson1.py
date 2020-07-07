# Tkinter 라이브러리 호출
import tkinter as tk

# 메인 윈도우 생성
main_win = tk.Tk()
# 메인 윈도우 이름 설정
main_win.title("CB_Calc")

# 디스플레이 엔트리 생성 및 배치
display_entry = tk.Entry(main_win, width=45, bg="light green")
display_entry.grid(row=0, column=0)

# 숫자1 버튼 생성 및 배치
button1 = tk.Button(main_win, text="1", width=5)
button1.grid(row=1, column=0, sticky='W')

# 숫자2 버튼 생성 및 배치
button2 = tk.Button(main_win, text="2", width=5)
button2.grid(row=2, column=0, sticky='W')

# 숫자3 버튼 생성 및 배치
button3 = tk.Button(main_win, text="3", width=5)
button3.grid(row=3, column=0, sticky='W')

# 메인 윈도우 반복 명령
main_win.mainloop()