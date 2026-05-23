# mnist.h5로 저장된 케라스 모델의 학습 성능을 보여주는 코드는 다음과 같다.

import tensorflow as tf
import numpy as np
# matplotlib.pyplot은 그래프를 그리는 라이브러리
import matplotlib.pyplot as plt

# 학습된 모델 불러오기
model = tf.keras.models.load_model('mnist.h5')
# MNIST 데이터셋 불러오기
mnist = tf.keras.datasets.mnist
# 테스트 데이터셋 불러오기
_, (x_test, y_test) = mnist.load_data()
# 테스트 데이터셋 전처리
x_test = x_test / 255.0
# 테스트 데이터셋 평가
model.evaluate(x_test, y_test, verbose=2)
# 테스트 데이터셋에서 무작위로 하나의 데이터를 선택한다.
index = np.random.choice(len(x_test))
# 선택된 데이터를 화면에 표시한다.
plt.imshow(x_test[index], cmap='gray')
plt.show()
# 선택된 데이터를 모델에 넣어 결과를 얻는다.
pred = model.predict(x_test[index:index+1])
# 결과를 화면에 표시한다.
print('예측값:', pred.argmax())
print('정답:', y_test[index])
# 학습된 모델의 정확도를 표시한다.
print('정확도:', model.evaluate(x_test, y_test, verbose=0)[1])
