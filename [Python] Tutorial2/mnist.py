# 256*256 캔버스에 마우스로 숫자를 그리면 그 숫자를 인식하는 프로그램
# 1. 캔버스에 마우스로 숫자를 그린다.
# 2. 그린 숫자를 28*28로 변환한다.
# 3. 변환된 숫자를 학습된 모델에 넣어서 결과를 얻는다.
# 4. 결과를 화면에 표시한다.
# 5. 1로 돌아간다.

import tensorflow as tf
import numpy as np
import cv2
import matplotlib.pyplot as plt

# 1. 캔버스에 마우스로 숫자를 그린다.
# 캔버스의 크기
width = 256
height = 256
# 캔버스 생성
canvas = np.zeros((width, height), np.uint8)
# 캔버스에 그림을 그리는 함수
# 마우스의 상태를 저장할 변수
# True: 마우스 버튼이 눌러진 상태
# False: 마우스 버튼이 눌러지지 않은 상태
mouse_pressed = False
# 마우스 이벤트 처리 함수
def mouse_callback(event, x, y, flags, param):
    global canvas, mouse_pressed
    # 마우스 왼쪽 버튼이 눌러지면 mouse_pressed를 True로
    if event == cv2.EVENT_LBUTTONDOWN:
        mouse_pressed = True
    # 마우스가 움직이면서 왼쪽 버튼이 눌러지면
    # 마우스 움직임에 따라 선을 그린다
    elif event == cv2.EVENT_MOUSEMOVE and mouse_pressed:
        cv2.circle(canvas, (x, y), 13, (255, 255, 255), -1)
    
    # 마우스 왼쪽 버튼이 떼지면 mouse_pressed를 False로
    elif event == cv2.EVENT_LBUTTONUP:
        mouse_pressed = False
# 윈도우 생성
cv2.namedWindow('canvas')
# 마우스 이벤트 처리 함수 등록
cv2.setMouseCallback('canvas', mouse_callback)

# 학습된 모델 불러오기
model = tf.keras.models.load_model('mnist.h5')
# 무한 반복
while True:
    # 캔버스를 화면에 표시한다.
    cv2.imshow('canvas', canvas)
    # ESC 키가 눌리면 반복 종료
    if cv2.waitKey(1) & 0xFF == 27:
        break
    # 스페이스바가 눌리면
    elif cv2.waitKey(1) & 0xFF == ord(' '):
        # 캔버스의 크기를 28*28로 변환한다.
        img = cv2.resize(canvas, (28, 28), interpolation=cv2.INTER_AREA)
        
        # 변환된 img를 출력한다
        plt.imshow(img, cmap='gray')
        plt.show()

        # 캔버스의 흑백을 0~1 사이의 값으로 변환한다.
        img = img / 255.0
        # 캔버스의 흑백을 3차원 배열로 변환한다.
        img = img.reshape((1, 28, 28, 1))
        # 학습된 모델에 넣어서 결과를 얻는다.
        res = model.predict(img)
        # 결과를 화면에 표시한다.
        print('예측 숫자:', np.argmax(res))
        # 캔버스를 초기화한다.
        canvas.fill(0)
# 윈도우 종료
cv2.destroyAllWindows()




