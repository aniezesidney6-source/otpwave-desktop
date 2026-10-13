"""Draw the OTPWave mark (indigo rounded square, white wave) at every size the app needs."""
import numpy as np
from PIL import Image, ImageDraw


def mark(size):
    S = size * 4  # supersample, then downscale for smooth edges
    # Diagonal gradient #6366f1 (top-left) -> #4f46e5 (bottom-right).
    yy, xx = np.mgrid[0:S, 0:S]
    t = ((xx + yy) / (2 * (S - 1)))[..., None]
    a, b = np.array([0x63, 0x66, 0xF1]), np.array([0x4F, 0x46, 0xE5])
    rgb = Image.fromarray((a + (b - a) * t).astype(np.uint8), "RGB")
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 8 / 32), fill=255)
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    im.paste(rgb, (0, 0), mask)

    # Wave "M6 18 q5-9 10 0 t10 0" on a 32-unit grid, stamped as dense discs = seamless stroke.
    def q(p0, p1, p2, n=400):
        return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                 (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (i / n for i in range(n + 1))]
    k = S / 32
    r = 1.5 * k
    d = ImageDraw.Draw(im)
    for x, y in q((6, 18), (11, 9), (16, 18)) + q((16, 18), (21, 27), (26, 18)):
        d.ellipse([x * k - r, y * k - r, x * k + r, y * k + r], fill="white")
    return im.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    big = mark(512)
    big.save("build/icon.png")
    big.save("build/icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    mark(32).save("assets/tray.png")
    mark(64).save("assets/tray@2x.png")
    mark(256).save("assets/icon.png")
    print("icons written")
