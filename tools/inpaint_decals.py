# Yapay zekâ görsellerindeki anlamsız yazıları gövde rengiyle doldurur (OpenCV inpaint). Kullanım: python -I inpaint_decals.py giris.png cikis.png "[[x0,y0,x1,y1],...]"
import sys, json
import cv2, numpy as np
src, dst, rects = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
im = cv2.imread(src, cv2.IMREAD_UNCHANGED)
rgb, a = im[:, :, :3].copy(), im[:, :, 3]
mask = np.zeros(rgb.shape[:2], np.uint8)
for x0, y0, x1, y1 in rects:
    mask[y0 - 2:y1 + 2, x0 - 2:x1 + 2] = 255
# Yalnızca açık renkli yazı piksellerini değil, kutunun tamamını doldur; komşu gövde rengi taşınır
out = cv2.inpaint(rgb, mask, 3, cv2.INPAINT_NS)
cv2.imwrite(dst, np.dstack([out, a]))
