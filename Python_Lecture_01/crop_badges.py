from PIL import Image
import numpy as np
from collections import deque

src = Image.open("C:/Workspace/Programming/Python_Lecture_01/배지 디자인.png").convert("RGBA")
out = "C:/Workspace/Programming/Python_Lecture_01/badges"

# 1536x1024 기준 — y2를 라벨 텍스트 위로 줄여서 아이콘만 크롭
badges = [
    ("badge_first_success",     52,  88,  328, 340),
    ("badge_streak_3",         436,  88,  712, 340),
    ("badge_streak_5",         820,  88, 1096, 340),
    ("badge_streak_7",        1204,  88, 1480, 340),
    ("badge_iron_will_1",       30, 500,  280, 690),
    ("badge_iron_will_2",      340, 500,  590, 690),
    ("badge_iron_will_3",      650, 500,  900, 690),
    ("badge_first_window",     960, 500, 1210, 690),
    ("badge_lesson1_complete", 1270, 500, 1520, 690),
]

def remove_dark_bg(img, threshold=28):
    """Flood-fill from image edges to remove dark background, making it transparent."""
    data = np.array(img, dtype=np.uint8)
    h, w = data.shape[:2]

    is_dark = (data[:,:,0] < threshold) & (data[:,:,1] < threshold) & (data[:,:,2] < threshold)
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    # seed from all four edges
    for x in range(w):
        for y in (0, h - 1):
            if is_dark[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_dark[y, x] and not visited[y, x]:
                visited[y, x] = True
                queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_dark[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    data[visited, 3] = 0   # transparent
    return Image.fromarray(data)

for name, x1, y1, x2, y2 in badges:
    cropped = src.crop((x1, y1, x2, y2))
    result  = remove_dark_bg(cropped)
    result.save(f"{out}/{name}.png")
    print(f"saved {name}.png  ({x2-x1} x {y2-y1})")
