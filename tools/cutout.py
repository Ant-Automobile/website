# Konsept görsellerin arka planını ayırır (rembg, isnet-general-use). Kullanım: python -I cutout.py giris.jpg cikis.png [...]
import sys
from rembg import remove, new_session
from PIL import Image
sess = new_session("isnet-general-use")
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert("RGB")
    out = remove(im, session=sess, post_process_mask=True)
    out.save(dst)
    print(dst, out.getbbox())
