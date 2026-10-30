"""CAD siluet maskelerini (5 mm çözünürlük) mm koordinatlı SVG path'lerine çevirir."""
import json, sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

src, out = sys.argv[1], sys.argv[2]
d = np.load(src)
res = float(d["res"])

def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab) or 1.0
    w = pts - a
    dist = np.abs(ab[0] * w[:, 1] - ab[1] * w[:, 0]) / n
    i = int(np.argmax(dist))
    if dist[i] > eps:
        return np.vstack([rdp(pts[: i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.array([a, b])

def paths(mask, box, view):
    x0, x1, y0, y1 = box
    m = np.pad(mask.astype(float), 1)
    fig = plt.figure()
    cs = plt.contour(m, levels=[0.5])
    segs = cs.allsegs[0]
    plt.close(fig)
    out = []
    for s in segs:
        if len(s) < 8:
            continue
        s = s - 1  # pad
        X = x0 + s[:, 0] * res
        Y = y0 + s[:, 1] * res
        if view in ("yan", "on"):
            Y = -Y  # SVG y aşağı: z yukarı olsun
        P = np.column_stack([X, Y])
        k = int(np.argmax(np.hypot(*(P - P[0]).T)))
        p = np.vstack([rdp(P[: k + 1], 1.6)[:-1], rdp(P[k:], 1.6)])
        out.append("M" + "L".join(f"{a:.0f} {b:.0f}" for a, b in p) + "Z")
    return out

res_json = {}
for view, box in (("yan", d["sin_yan"]), ("ust", d["sin_ust"]), ("on", d["sin_on"])):
    v = {}
    for part in ("govde", "teker", "cam", "ayna"):
        k = f"{view}_{part}"
        if k in d.files:
            v[part] = paths(d[k], box, view)
    res_json[view] = v
json.dump(res_json, open(out, "w"))
print({v: {p: len(x) for p, x in res_json[v].items()} for v in res_json})
