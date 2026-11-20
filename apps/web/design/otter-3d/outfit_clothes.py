"""몸에 입는 해달 옷 (build_outfits.py 가 불러 쓴다. 실행 방법도 그 파일에 있다).

옷은 세 조각이다:
  몸판   해달 몸통·배의 겉면을 CLOTH 만큼 띄워 감싼 껍질 (OutfitTorso 아래)
  소매   팔과 같은 자리·방향의 통 (OutfitArmL / OutfitArmR 아래. 팔을 따라 돌고 늘어난다)
  무늬   평평하게 그린 도형·글자를 몸판 겉면에 감아 붙인 얇은 조각 (그림 파일 없이 재질 색만 쓴다)
몸에 입는 옷을 입으면 three.js 코드가 기본 목도리를 숨긴다 (otter-outfit.ts).
"""

import math

import bmesh
import bpy
from mathutils import Vector, noise

# 재질 이름 → (밝은 면, 어두운 면). toon.ts 의 색과 맞춘다
MATERIALS = {
    "ShirtWhite": ("#FBFAF6", "#DCD8CE"),
    "ShirtAqua": ("#62CBD6", "#45AEBB"),
    "ShirtCoral": ("#F27B63", "#D9604A"),
    "TrimAqua": ("#3DAEBF", "#2F95A6"),
    "TrimCoral": ("#F9A48E", "#E68A73"),
    "ClothNavy": ("#33507F", "#273F68"),
    "ClothRed": ("#DE4B4E", "#BE3A3E"),
    "PrintWhite": ("#FFFFFF", "#E6E6E6"),
    "PrintBlack": ("#2B2B36", "#22222B"),
    "PrintRed": ("#E8343F", "#C92A35"),
    "PrintYellow": ("#FFD95A", "#E8BE45"),
    "PrintGreen": ("#4FA66B", "#3F8C58"),
    "PrintNavy": ("#2D4A7D", "#243C66"),
    "SantaRed": ("#D8343B", "#B5262E"),
    "SantaFur": ("#FFFDF8", "#E3DED3"),
    "DeerBrown": ("#B07A4A", "#93623A"),
    "DeerBelly": ("#F5E6C8", "#E0CDA8"),
    "Antler": ("#C89A66", "#A87C4C"),
    "RudolphNose": ("#E8343F", "#C3262F"),
}

# build_otter.py 의 몸 치수 (Body, Belly, 어깨, 손 자리)
BODY_Z, BODY_R = 0.78, (0.74, 0.64, 0.84)
BELLY_Y, BELLY_Z, BELLY_R = -0.36, 0.64, (0.46, 0.34, 0.52)
SHOULDERS = {"L": Vector((-0.44, -0.2, 1.12)), "R": Vector((0.44, -0.2, 1.12))}
_GRIP, _TIP = Vector((0.0, -0.76, 0.84)), Vector((-2.4, -0.82, 1.3))
_ALONG = (_TIP - _GRIP).normalized()
GRIPS = {"L": _GRIP + _ALONG * 0.17, "R": _GRIP - _ALONG * 0.13}

SYB = BODY_R[1] / BODY_R[0]  # 몸통이 앞뒤로 납작한 정도
CLOTH = 0.035  # 옷감이 몸에서 뜬 거리
HEM_Z, NECK_Z = 0.38, 1.28  # 밑단과 목둘레 높이
FRONT, BACK = -math.pi / 2, math.pi / 2  # 앞(-Y)·뒤(+Y) 방향
PRINT_LIFT, PRINT_LAYER = 0.012, 0.002  # 무늬가 옷감에서 뜬 거리, 한 자리에서 겹칠 때마다 더 띄우는 거리
PRINT_EDGE = 0.05  # 무늬 조각의 가장 긴 변 (이보다 길면 쪼개야 몸의 굴곡을 따라간다)


def pear(cz):
    """build_otter.py 의 서양배 모양 배율 (cz 는 -1 ~ 1)"""
    t = (cz + 1) / 2
    s = min(max((t - 0.2) / 0.7, 0), 1)
    s = s * s * (3 - 2 * s)
    return 1.1 + (0.74 - 1.1) * s


def skin_radius(theta, z):
    """높이 z, 방향 theta 에서 몸 겉면(몸통과 배 중 더 나온 쪽)까지의 거리.
    점은 (r cos, r SYB sin, z) 에 있다"""
    cz = (z - BODY_Z) / BODY_R[2]
    r = BODY_R[0] * pear(cz) * math.sqrt(max(1 - cz * cz, 0))
    cb = (z - BELLY_Z) / BELLY_R[2]
    if abs(cb) < 1:
        k = pear(cb) * math.sqrt(1 - cb * cb)
        a, b = BELLY_R[0] * k, BELLY_R[1] * k
        c, s = math.cos(theta), math.sin(theta) * SYB
        qa = c * c / (a * a) + s * s / (b * b)
        qb = -2 * BELLY_Y * s / (b * b)
        qc = BELLY_Y * BELLY_Y / (b * b) - 1
        disc = qb * qb - 4 * qa * qc
        if disc >= 0:
            r = max(r, (-qb + math.sqrt(disc)) / (2 * qa))
    return r


def cloth_point(theta, z, lift=0.0):
    r = skin_radius(theta, z) + CLOTH + lift
    return Vector((r * math.cos(theta), r * math.sin(theta) * SYB, z))


def wrap(u, v, theta0, z0, lift):
    """평평한 그림의 점 (u = 가로, v = 세로)을 몸판에 감는다. theta0·z0 이 그림의 가운데"""
    z = z0 + v
    return cloth_point(theta0 + u / (skin_radius(theta0, z) + CLOTH), z, lift)


def orient_outward(bm):
    """면이 몸 바깥을 보게 한다 (열린 조각은 자동 계산이 안쪽을 볼 수 있다)"""
    bm.normal_update()
    for face in bm.faces:
        c = face.calc_center_median()
        if face.normal.dot(Vector((c.x, c.y / (SYB * SYB), 0))) < 0:
            face.normal_flip()


def tube(profile, segments, closed=False):
    """profile [(r, z)] 을 Z 축으로 돌린 통. closed 면 단면이 닫힌 고리다"""
    bm = bmesh.new()
    rings = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    n = len(profile)
    for i in range(segments):
        a, c = rings[i], rings[(i + 1) % segments]
        for j in range(n if closed else n - 1):
            bm.faces.new((a[j], c[j], c[(j + 1) % n], a[(j + 1) % n]))
    if closed:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


# ---- 몸판·깃·소매 -----------------------------------------------------------------


def build_shell(b, mat, hem=HEM_Z, neck=NECK_Z):
    cols, rows = 64, 24
    bm = bmesh.new()
    grid = []
    for i in range(cols):
        theta = 2 * math.pi * i / cols
        grid.append([bm.verts.new(cloth_point(theta, hem + (neck - hem) * j / rows)) for j in range(rows + 1)])
    for i in range(cols):
        a, c = grid[i], grid[(i + 1) % cols]
        for j in range(rows):
            bm.faces.new((a[j], c[j], c[j + 1], a[j + 1]))
    orient_outward(bm)
    return b.raw("Shirt", bm, mat, b.attach("OutfitTorso"))


def build_collar(b, mat, tube_radius=0.045):
    """목둘레를 두르는 둥근 깃"""
    r0 = skin_radius(0, NECK_Z) + CLOTH
    steps = 8
    ring = [
        (r0 + tube_radius * math.cos(2 * math.pi * k / steps), tube_radius * math.sin(2 * math.pi * k / steps))
        for k in range(steps)
    ]
    thetas = [2 * math.pi * i / 48 for i in range(48)]
    return b.lathe("Collar", ring + ring[:1], thetas, [mat], b.attach("OutfitTorso"), (0, 0, NECK_Z), sy=SYB)


def build_sleeves(b, mat, trim=None, length=0.36, trim_size=(0.024, 0.08)):
    """반소매. 팔과 같은 자리·방향의 노드 아래에, 어깨가 원점이고 로컬 Z 로 뻗게 만든다.
    trim 을 주면 소매 끝에 그 재질의 단을 두른다 (trim_size = 두께, 너비)"""
    for side in ("L", "R"):
        reach = GRIPS[side] - SHOULDERS[side]
        rot = Vector((0, 0, 1)).rotation_difference(reach.normalized()).to_euler()
        holder = b.attach(f"OutfitArm{side}", SHOULDERS[side], rot)
        profile = [(0.15, -0.05), (0.19, 0.0), (0.205, 0.12), (0.21, 0.26), (0.205, length)]
        b.raw(f"Sleeve{side}", tube(profile, 20), mat, holder, local=True)
        if trim:
            thick, width = trim_size
            band = [
                (0.2, length - width + 0.005), (0.2 + thick, length - width + 0.01),
                (0.2 + thick, length + 0.004), (0.2, length + 0.01),
            ]
            b.raw(f"SleeveTrim{side}", tube(band, 20, closed=True), trim, holder, local=True)


def build_fur_ring(b, name, z, tube_radius, mat="SantaFur"):
    """몸을 한 바퀴 두르는 도톰한 털 단 (밑단·깃). 겉을 울퉁불퉁하게 해 복슬복슬해 보이게 한다"""
    cols, steps = 64, 8
    bm = bmesh.new()
    rings = []
    for i in range(cols):
        theta = 2 * math.pi * i / cols
        center = cloth_point(theta, z)
        radial = Vector((math.cos(theta), math.sin(theta) * SYB, 0)).normalized()
        ring = []
        for k in range(steps):
            a = 2 * math.pi * k / steps
            bump = 1 + 0.12 * noise.noise(Vector((3 * math.cos(theta), 3 * math.sin(theta), 1.7 * k)))
            rho = tube_radius * bump
            ring.append(bm.verts.new(center + radial * (rho * math.cos(a)) + Vector((0, 0, rho * math.sin(a)))))
        rings.append(ring)
    for i in range(cols):
        a, c = rings[i], rings[(i + 1) % cols]
        for k in range(steps):
            bm.faces.new((a[k], c[k], c[(k + 1) % steps], a[(k + 1) % steps]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return b.raw(name, bm, mat, b.attach("OutfitTorso"))


# ---- 무늬 ------------------------------------------------------------------------


def flat_poly(points):
    bm = bmesh.new()
    bm.faces.new([bm.verts.new((u, v, 0)) for u, v in points])
    return bm


def ellipse(cu, cv, ru, rv, rot=0.0, steps=20):
    c, s = math.cos(rot), math.sin(rot)
    pts = []
    for k in range(steps):
        a = 2 * math.pi * k / steps
        x, y = ru * math.cos(a), rv * math.sin(a)
        pts.append((cu + x * c - y * s, cv + x * s + y * c))
    return flat_poly(pts)


def heart(size, steps=40):
    pts = []
    for k in range(steps):
        t = 2 * math.pi * k / steps
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((size * x / 32, size * (y + 2.5) / 32))
    return flat_poly(pts)


def flat_text(b, body, height, weight=0.03):
    """글자를 평평한 메시로 만든다 (Blender 기본 글꼴, weight 만큼 획을 굵게). 가운데가 원점, 높이가 height"""
    curve = bpy.data.curves.new("PrintText", "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.offset = weight
    obj = bpy.data.objects.new("PrintText", curve)
    b.col.objects.link(obj)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(obj, do_unlink=True)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bpy.data.meshes.remove(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    k = height / (max(ys) - min(ys))
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    for v in bm.verts:
        v.co = Vector(((v.co.x - cx) * k, (v.co.y - cy) * k, 0))
    return bm


def tessellate(bm):
    """몸의 굴곡을 따라가게 긴 변을 쪼갠다"""
    bmesh.ops.triangulate(bm, faces=bm.faces)
    for _ in range(8):
        long_edges = [e for e in bm.edges if e.calc_length() > PRINT_EDGE]
        if not long_edges:
            break
        bmesh.ops.subdivide_edges(bm, edges=long_edges, cuts=1)
        bmesh.ops.triangulate(bm, faces=bm.faces)


class Print:
    """옷에 찍는 무늬. 한 자리(at)에서는 나중에 넣은 도형이 위에 온다. 같은 재질은 메시 하나로 합친다"""

    def __init__(self, b):
        self.b = b
        self.merged = {}
        self.count = 0
        self.theta0, self.z0 = FRONT, 1.0

    def at(self, theta0, z0, layer=0):
        """다음 도형들의 가운데 자리 (방향, 높이). 다른 자리의 도형 위에 겹쳐야 하면 layer 를 그만큼 올린다"""
        self.theta0, self.z0, self.count = theta0, z0, layer
        return self

    def _lift(self):
        self.count += 1
        return PRINT_LIFT + PRINT_LAYER * self.count

    def _merge(self, bm, mat):
        orient_outward(bm)
        target = self.merged.setdefault(mat, bmesh.new())
        verts = {v: target.verts.new(v.co) for v in bm.verts}
        for face in bm.faces:
            target.faces.new([verts[v] for v in face.verts])
        bm.free()

    def add(self, bm, mat, du=0.0, dv=0.0):
        lift = self._lift()
        for v in bm.verts:
            v.co = Vector((v.co.x + du, v.co.y + dv, 0))
        tessellate(bm)
        for v in bm.verts:
            v.co = wrap(v.co.x, v.co.y, self.theta0, self.z0, lift)
        self._merge(bm, mat)

    def ring(self, z_low, z_high, mat, wave=0.0, waves=0, cols=64):
        """몸을 한 바퀴 두르는 띠. wave 를 주면 높이 wave 로 waves 번 물결친다"""
        lift = self._lift()
        bm = bmesh.new()
        grid = []
        for i in range(cols):
            theta = 2 * math.pi * i / cols
            dz = wave * math.sin(waves * theta)
            grid.append(
                [bm.verts.new(cloth_point(theta, z + dz, lift)) for z in (z_low, (z_low + z_high) / 2, z_high)]
            )
        for i in range(cols):
            a, c = grid[i], grid[(i + 1) % cols]
            for j in range(2):
                bm.faces.new((a[j], c[j], c[j + 1], a[j + 1]))
        self._merge(bm, mat)

    def flush(self):
        torso = self.b.attach("OutfitTorso")
        for mat, bm in self.merged.items():
            self.b.raw(f"Print{mat}", bm, mat, torso)
        self.merged = {}


def whale(p, w):
    """왼쪽을 보는 고래 (가로 w). 몸, 꼬리, 지느러미, 물줄기, 눈"""
    p.add(ellipse(0.3 * w, 0.09 * w, 0.15 * w, 0.075 * w, math.radians(28)), "PrintWhite")
    p.add(ellipse(0.4 * w, 0.24 * w, 0.11 * w, 0.055 * w, math.radians(55)), "PrintWhite")
    p.add(ellipse(0.47 * w, 0.13 * w, 0.11 * w, 0.055 * w, math.radians(-8)), "PrintWhite")
    p.add(ellipse(-0.08 * w, 0.0, 0.38 * w, 0.21 * w), "PrintWhite")
    p.add(ellipse(-0.06 * w, -0.2 * w, 0.1 * w, 0.045 * w, math.radians(-35)), "PrintWhite")
    for du, dv, tilt in ((-0.27, 0.3, 25), (-0.19, 0.34, 0), (-0.11, 0.3, -25)):
        p.add(ellipse(du * w, dv * w, 0.028 * w, 0.055 * w, math.radians(tilt), 10), "PrintWhite")
    p.add(ellipse(-0.3 * w, 0.03 * w, 0.03 * w, 0.03 * w, 0, 10), "PrintNavy")


def hibiscus(p, size, spin):
    """꽃잎 다섯 장인 꽃 (지름이 size 쯤) 과 잎 두 장"""
    for k in (0, 1):
        a = spin + math.radians(200 + 70 * k)
        p.add(ellipse(0.62 * size * math.cos(a), 0.62 * size * math.sin(a), 0.36 * size, 0.17 * size, a, 12), "PrintGreen")
    for k in range(5):
        a = spin + 2 * math.pi * k / 5
        p.add(ellipse(0.3 * size * math.cos(a), 0.3 * size * math.sin(a), 0.3 * size, 0.22 * size, a, 12), "PrintWhite")
    p.add(ellipse(0, 0, 0.13 * size, 0.13 * size, 0, 10), "PrintYellow")


# ---- 옷 4종 ----------------------------------------------------------------------


def build_aquarium_tee(b):
    """아쿠아리움 기념 티셔츠: 물빛 티셔츠에 흰 고래와 물결. 앞은 배에 고래, 뒤는 큰 고래와 글자"""
    build_shell(b, "ShirtAqua")
    build_collar(b, "TrimAqua")
    build_sleeves(b, "ShirtAqua", trim="TrimAqua")
    p = Print(b)
    whale(p.at(FRONT, 0.535), 0.5)
    # 가슴은 팔에 가려 글자를 넣을 자리가 없어, 몸을 한 바퀴 도는 물결 두 줄을 넣는다
    for z in (1.15, 1.085):
        p.ring(z - 0.013, z + 0.013, "PrintWhite", wave=0.016, waves=16, cols=160)
    whale(p.at(BACK, 0.86), 0.66)
    p.at(BACK, 0.54).add(flat_text(b, "AQUARIUM", 0.13), "PrintWhite")
    p.flush()


def build_busan_tee(b):
    """아이 러브 부산 기념 티셔츠: 흰 티셔츠에 검은 글자와 빨간 하트"""
    build_shell(b, "ShirtWhite")
    build_collar(b, "ShirtWhite")
    build_sleeves(b, "ShirtWhite")
    p = Print(b)
    p.at(FRONT, 1.11)
    p.add(flat_text(b, "I", 0.16, 0.045), "PrintBlack", du=-0.13)
    p.add(heart(0.21), "PrintRed", du=0.07)
    p.at(FRONT, 0.53).add(flat_text(b, "BUSAN", 0.16, 0.04), "PrintBlack")
    p.at(BACK, 1.0)
    p.add(flat_text(b, "I", 0.27, 0.045), "PrintBlack", du=-0.22)
    p.add(heart(0.36), "PrintRed", du=0.12)
    p.at(BACK, 0.62).add(flat_text(b, "BUSAN", 0.21, 0.04), "PrintBlack")
    p.flush()


def build_sailor_top(b):
    """세일러 셔츠: 흰 셔츠에 남색 세일러 깃(앞은 V, 뒤는 네모)과 빨간 매듭. 선장 모자와 한 벌"""
    torso = b.attach("OutfitTorso")
    build_shell(b, "ShirtWhite")
    build_sleeves(b, "ShirtWhite", trim="ClothNavy")
    p = Print(b)
    p.ring(NECK_Z - 0.11, NECK_Z + 0.012, "ClothNavy")
    p.at(BACK, NECK_Z)
    p.add(flat_poly([(-0.4, 0.0), (0.4, 0.0), (0.4, -0.36), (-0.4, -0.36)]), "ClothNavy")
    p.add(flat_poly([(-0.35, -0.31), (0.35, -0.31), (0.35, -0.288), (-0.35, -0.288)]), "PrintWhite")
    for sx in (-1, 1):
        p.add(flat_poly([(0.35 * sx, -0.31), (0.328 * sx, -0.31), (0.328 * sx, -0.11), (0.35 * sx, -0.11)]), "PrintWhite")
    p.at(FRONT, NECK_Z)
    for sx in (-1, 1):
        p.add(flat_poly([(0.42 * sx, 0.0), (0.18 * sx, 0.0), (0.0, -0.17), (0.0, -0.32)]), "ClothNavy")
    for sx in (-1, 1):
        p.add(flat_poly([(0.37 * sx, -0.02), (0.34 * sx, -0.02), (0.0, -0.262), (0.0, -0.285)]), "PrintWhite")
    p.flush()

    knot = cloth_point(FRONT, 1.0, 0.04)
    b.ell("SailorKnot", knot, (0.085, 0.06, 0.07), "ClothRed", torso, seg=16, rings=8)
    for sx in (-1, 1):
        b.ell(
            f"SailorTie{sx:+d}", knot + Vector((0.065 * sx, 0.01, -0.11)), (0.05, 0.035, 0.1), "ClothRed", torso,
            rot=(0, math.radians(-22) * sx, 0), seg=12, rings=8,
        )


def build_aloha_shirt(b):
    """하와이안 셔츠: 다홍 셔츠에 흰 꽃과 초록 잎, 열린 깃과 단추. 밀짚모자·선글라스와 한 벌"""
    build_shell(b, "ShirtCoral")
    build_collar(b, "TrimCoral", tube_radius=0.04)
    build_sleeves(b, "ShirtCoral")
    p = Print(b)
    flowers = [
        (250, 0.57, 0.2, 0.3), (292, 0.6, 0.18, 1.2), (243, 1.08, 0.17, 2.0), (297, 1.1, 0.17, 0.8),
        (205, 0.82, 0.2, 1.6), (336, 0.85, 0.2, 0.2), (182, 0.52, 0.18, 2.6), (2, 0.56, 0.18, 1.0),
        (172, 1.08, 0.16, 0.5), (12, 1.06, 0.16, 2.2), (90, 1.02, 0.22, 0.4), (58, 0.64, 0.2, 1.8),
        (122, 0.68, 0.2, 2.9), (92, 0.5, 0.16, 1.3), (140, 1.05, 0.15, 0.9), (40, 1.08, 0.15, 2.4),
    ]
    for deg, z, size, spin in flowers:
        hibiscus(p.at(math.radians(deg), z), size, spin)
    p.at(FRONT, NECK_Z, layer=10)  # 꽃 위에 겹친다
    p.add(flat_poly([(-0.014, -0.05), (0.014, -0.05), (0.014, HEM_Z - NECK_Z), (-0.014, HEM_Z - NECK_Z)]), "TrimCoral")
    for sx in (-1, 1):
        p.add(flat_poly([(0.34 * sx, 0.01), (0.03 * sx, 0.01), (0.09 * sx, -0.2), (0.3 * sx, -0.12)]), "TrimCoral")
    for dv in (-0.3, -0.52, -0.7, -0.84):
        p.add(ellipse(0, dv, 0.024, 0.024, 0, 10), "PrintWhite")
    p.flush()


def build_santa_suit(b):
    """산타 옷: 빨간 옷에 흰 털 깃·밑단·소매 단·앞섶, 검은 허리띠와 금색 버클. 산타 모자와 한 벌"""
    build_shell(b, "SantaRed")
    build_sleeves(b, "SantaRed", trim="SantaFur", trim_size=(0.05, 0.11))
    build_fur_ring(b, "SantaHem", HEM_Z + 0.02, 0.075)
    build_fur_ring(b, "SantaCollar", NECK_Z - 0.01, 0.08)
    p = Print(b)
    p.at(FRONT, NECK_Z)
    front = HEM_Z - NECK_Z + 0.06
    p.add(flat_poly([(-0.05, -0.05), (0.05, -0.05), (0.05, front), (-0.05, front)]), "SantaFur")
    p.ring(0.5, 0.6, "PrintBlack")
    p.at(FRONT, 0.55, layer=3)  # 버클은 허리띠 위에 겹친다
    p.add(flat_poly([(-0.09, -0.075), (0.09, -0.075), (0.09, 0.075), (-0.09, 0.075)]), "PrintYellow")
    p.add(flat_poly([(-0.052, -0.04), (0.052, -0.04), (0.052, 0.04), (-0.052, 0.04)]), "PrintBlack")
    p.flush()


def build_rudolph_suit(b):
    """루돌프 옷: 갈색 옷에 크림색 배와 소매 단, 등의 점무늬, 빨간 목걸이와 금색 방울. 루돌프 뿔·코와 한 벌"""
    torso = b.attach("OutfitTorso")
    build_shell(b, "DeerBrown")
    build_sleeves(b, "DeerBrown", trim="DeerBelly", trim_size=(0.03, 0.09))
    p = Print(b)
    p.at(FRONT, 0.72).add(ellipse(0, 0, 0.36, 0.34, 0, 28), "DeerBelly")
    # 등의 점무늬 (아기 사슴처럼)
    for du, dv, radius in ((-0.22, 0.2, 0.07), (0.2, 0.26, 0.06), (0.02, 0.02, 0.075), (-0.26, -0.14, 0.055), (0.27, -0.1, 0.065)):
        p.at(BACK, 0.85).add(ellipse(du, dv, radius, radius * 0.85, 0, 12), "DeerBelly")
    p.ring(NECK_Z - 0.09, NECK_Z + 0.012, "ClothRed")
    p.flush()

    bell = cloth_point(FRONT, NECK_Z - 0.13, 0.06)
    b.ell("Bell", bell, (0.085, 0.075, 0.085), "CapGold", torso, seg=16, rings=10)
    b.ell("BellSlit", bell + Vector((0, -0.068, -0.03)), (0.05, 0.015, 0.014), "PrintBlack", torso, seg=8, rings=4)


OUTFITS = {
    "rudolph-suit": build_rudolph_suit,
    "santa-suit": build_santa_suit,
    "aquarium-tee": build_aquarium_tee,
    "busan-tee": build_busan_tee,
    "sailor-top": build_sailor_top,
    "aloha-shirt": build_aloha_shirt,
}
