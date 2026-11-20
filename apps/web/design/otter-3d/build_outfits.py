"""해달 옷(소품) 모델을 Blender 에서 만드는 스크립트. 소품 하나가 glb 하나다.

화면 없이 실행한다 (apps/web 에서):
  /Applications/Blender.app/Contents/MacOS/Blender --background --python design/otter-3d/build_outfits.py -- src/shared/assets/otter/outfits

좌표는 build_otter.py 와 같다 (Z 가 위, 해달은 -Y 를 바라본다).
맨 위 노드의 이름이 붙을 자리를 정한다. three.js 코드(otter-outfit.ts)가 그 노드를 해달의 같은 자리 노드 아래에 옮겨 붙인다:
  Outfit                     머리 (HeadPivot 자리에 둔다). 모자·선글라스
  OutfitTorso                몸통 (Torso). 옷의 몸판과 무늬
  OutfitArmL, OutfitArmR     팔 (ArmL, ArmR 과 같은 자리·방향). 소매. 팔을 따라 돌고 늘어난다
재질 색과 테두리는 toon.ts 가 재질 이름으로 정한다. 몸에 입는 옷은 outfit_clothes.py 에 있다.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import outfit_clothes  # noqa: E402
from build_otter import Builder, make_material  # noqa: E402

HEAD_PIVOT = (0, 0, 1.3)  # build_otter.py 의 HeadPivot 자리
SY = 0.9  # 머리가 앞뒤로 납작한 만큼 모자도 앞뒤를 줄인다 (털모자와 같다)

# 재질 이름 → (밝은 면, 어두운 면). toon.ts 의 색과 맞춘다
MATERIALS = {
    "Straw": ("#F4D98F", "#DDB868"),
    "StrawBand": ("#DE4B4E", "#BE3A3E"),
    "CapWhite": ("#FBF8F1", "#DDD6C8"),
    "CapNavy": ("#33507F", "#273F68"),
    "CapGold": ("#F2C14E", "#D9A53A"),
    "Shades": ("#3A4160", "#2B3050"),
    "ShadesFrame": ("#23263A", "#23263A"),
    "White": ("#FFFFFF", "#FFFFFF"),
    **outfit_clothes.MATERIALS,
}


class OutfitBuilder(Builder):
    """화면 없이(--background) 돌리므로 창을 건드리지 않는다. 테두리 껍질도 만들지 않는다 (three.js 가 그린다)"""

    def __init__(self, collection):
        self.scene = bpy.context.scene
        col = bpy.data.collections.new(collection)
        self.scene.collection.children.link(col)
        self.col = col
        self.mats = bpy.data.materials
        self.roots = {}

    def attach(self, name, loc=(0, 0, 0), rot=None):
        """붙을 자리를 정하는 맨 위 노드 (한 소품 안에서 같은 이름은 하나만 만든다)"""
        if name not in self.roots:
            root = self.empty(name, loc)
            if rot is not None:
                root.rotation_euler = rot
            bpy.context.view_layer.update()
            self.roots[name] = root
        return self.roots[name]

    def head(self):
        return self.attach("Outfit", HEAD_PIVOT)

    def raw(self, name, bm, mat, parent, local=False):
        """면 방향을 다시 계산하지 않고 그대로 메시로 만든다 (열린 조각은 방향을 직접 정해야 한다).
        local 이면 꼭짓점을 parent 기준 좌표로 본다"""
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(name, me)
        self.col.objects.link(obj)
        obj.parent = parent
        if not local:
            obj.matrix_parent_inverse = parent.matrix_world.inverted()
        return self.finish(obj, [mat])

    def finish(self, obj, mats, outline=None, thick=0.018):
        return super().finish(obj, mats, outline=False)

    def arc(self, name, profile, thetas, radius_at, mat, parent, loc):
        """닫힌 단면(profile [(r, z)])을 thetas 구간만 돌린 조각 (한 바퀴를 다 돌지 않는다. 양 끝은 막는다).
        radius_at(theta, r) 로 각도마다 반지름을 바꿀 수 있다"""
        bm = bmesh.new()
        rings = []
        for theta in thetas:
            ring = []
            for r, z in profile:
                rr = radius_at(theta, r)
                ring.append(bm.verts.new((rr * math.cos(theta), rr * math.sin(theta) * SY, z)))
            rings.append(ring)
        n = len(profile)
        for a, b in zip(rings, rings[1:]):
            for j in range(n):
                bm.faces.new((a[j], b[j], b[(j + 1) % n], a[(j + 1) % n]))
        bm.faces.new(rings[0])
        bm.faces.new(rings[-1])
        return self.mesh(name, bm, [mat], parent, loc)


def circle(cx, cz, radius, steps=8):
    """lathe 에 넣을 닫힌 원 단면"""
    pts = [(cx + radius * math.cos(2 * math.pi * k / steps), cz + radius * math.sin(2 * math.pi * k / steps)) for k in range(steps)]
    return pts + pts[:1]


def full_turn(steps):
    return [2 * math.pi * i / steps for i in range(steps)]


# ---- 밀짚모자 ------------------------------------------------------------------


def build_straw_hat(b):
    """넓은 챙이 살짝 처진 밀짚모자 + 빨간 띠와 리본. 앞으로 조금 숙여 써서 챙 윗면이 보인다"""
    base_z = 2.4
    hat = b.empty("StrawHat", (0, 0, base_z), b.head())
    thetas = full_turn(48)

    # 챙: 안쪽에서 바깥으로 갈수록 처진다. 가장자리는 물결친다
    inner, outer, thick, droop = 0.5, 1.14, 0.055, 0.15
    fall = lambda r: -droop * ((r - inner) / (outer - inner)) ** 1.4
    top = [(r, 0.03 + fall(r)) for r in (inner, 0.66, 0.82, 0.98, 1.1)]
    edge = [(outer, 0.03 + fall(outer) - thick / 2)]
    bottom = [(r, 0.03 + fall(r) - thick) for r in (1.1, 0.98, 0.82, 0.66, inner)]
    brim = top + edge + bottom
    wave = lambda theta, j: 1 + 0.035 * math.cos(5 * theta + 0.6) * ((brim[j % len(brim)][0] - inner) / (outer - inner))
    b.lathe("StrawBrim", brim + brim[:1], thetas, ["Straw"], hat, (0, 0, base_z), sy=SY, mod=wave)

    # 모자 몸통: 위가 둥글게 닫힌 낮은 통
    crown = [(0.6, -0.02), (0.6, 0.18), (0.585, 0.31), (0.54, 0.41), (0.44, 0.48), (0.28, 0.52), (0.001, 0.53)]
    b.lathe("StrawCrown", crown, thetas, ["Straw"], hat, (0, 0, base_z), sy=SY)

    # 띠와 리본 (보는 사람 기준 오른쪽 앞)
    band = [(0.6, 0.03), (0.635, 0.04), (0.635, 0.17), (0.6, 0.18)]
    b.lathe("StrawBand", band + band[:1], thetas, ["StrawBand"], hat, (0, 0, base_z), sy=SY)
    angle = math.radians(-58)
    knot = Vector((0.66 * math.cos(angle), 0.66 * math.sin(angle) * SY, base_z + 0.105))
    side = Vector((-math.sin(angle), math.cos(angle) * SY, 0)).normalized()
    yaw = math.atan2(side.y, side.x)
    for sign in (-1, 1):
        b.ell(
            f"StrawBow{sign:+d}", knot + side * 0.13 * sign, (0.13, 0.05, 0.1), "StrawBand", hat,
            rot=(0, math.radians(18) * sign, yaw), seg=16, rings=8,
        )
    b.ell("StrawKnot", knot, (0.06, 0.06, 0.07), "StrawBand", hat, seg=12, rings=6)

    bpy.context.view_layer.update()
    hat.rotation_euler = (math.radians(7), 0, 0)  # 앞으로 숙인다


# ---- 선장 모자 -----------------------------------------------------------------


def build_captain_hat(b):
    """위가 넓게 부푼 흰 모자 + 남색 띠와 챙 + 금색 줄과 배지. 뒤로 조금 젖혀 써서 앞이 선다"""
    base_z = 2.36
    hat = b.empty("CaptainHat", (0, 0, base_z), b.head())
    thetas = full_turn(48)

    band = [(0.6, 0.0), (0.645, 0.01), (0.645, 0.19), (0.6, 0.2)]
    b.lathe("CapBand", band + band[:1], thetas, ["CapNavy"], hat, (0, 0, base_z), sy=SY)
    # 위로 갈수록 넓어졌다가 둥글게 닫힌다. 앞쪽(-Y)이 더 높다
    top = [(0.6, 0.17), (0.7, 0.22), (0.83, 0.32), (0.875, 0.41), (0.84, 0.49), (0.66, 0.545), (0.36, 0.57), (0.001, 0.578)]
    peak = lambda theta, j: 1 + 0.06 * (j / (len(top) - 1)) * max(-math.sin(theta), 0)
    b.lathe("CapTop", top, thetas, ["CapWhite"], hat, (0, 0, base_z), sy=SY, mod=peak)
    b.lathe("CapCord", circle(0.655, 0.045, 0.022), thetas, ["CapGold"], hat, (0, 0, base_z), sy=SY)

    # 챙: 앞쪽 반달. 양 끝으로 갈수록 좁아진다
    start, end, steps = math.radians(196), math.radians(344), 24
    visor_thetas = [start + (end - start) * i / steps for i in range(steps + 1)]
    visor = [(0.6, 0.03), (0.74, -0.045), (0.9, -0.17), (0.915, -0.195), (0.9, -0.21), (0.74, -0.09), (0.6, -0.02)]

    def visor_radius(theta, r):
        u = (theta - start) / (end - start)
        return 0.6 + (r - 0.6) * math.sin(math.pi * u) ** 0.7

    b.arc("CapVisor", visor, visor_thetas, visor_radius, "CapNavy", hat, (0, 0, base_z))

    # 배지: 띠 앞 가운데의 금색 닻 대신 둥근 방패 모양
    b.ell("CapBadge", (0, -0.645 * SY - 0.01, base_z + 0.125), (0.105, 0.035, 0.085), "CapGold", hat, seg=16, rings=8)

    bpy.context.view_layer.update()
    hat.rotation_euler = (math.radians(-6), 0, 0)  # 뒤로 젖힌다


# ---- 선글라스 ------------------------------------------------------------------


def build_sunglasses(b):
    """위가 납작한 둥근 렌즈 둘 + 코걸이 + 귀로 가는 다리"""
    root = b.head()
    eye_x, lens_y, lens_z = 0.31, -0.735, 2.0
    flat_top = lambda co: (1, 1, 0.78 if co.z > 0 else 1.0)
    for side, sx in (("L", -1), ("R", 1)):
        yaw = math.radians(16) * sx  # 머리 곡면을 따라 바깥으로 돌린다
        b.ell(
            f"Lens{side}", (eye_x * sx, lens_y, lens_z), (0.215, 0.05, 0.175), "Shades", root,
            rot=(0, 0, yaw), shape=flat_top, seg=24, rings=12,
        )
        # 렌즈 왼쪽 위의 반짝임. 렌즈가 돌아간 만큼 같이 돌려 렌즈 앞면에 얹는다
        shine = Matrix.Rotation(yaw, 3, "Z") @ Vector((-0.07, -0.05, 0.05))
        b.ell(
            f"LensShine{side}", Vector((eye_x * sx, lens_y, lens_z)) + shine, (0.065, 0.014, 0.024), "White",
            root, rot=(0, math.radians(-35), yaw), seg=10, rings=5,
        )
        temple = [(0.5 * sx, -0.64, 2.05), (0.72 * sx, -0.46, 2.07), (0.84 * sx, -0.24, 2.09), (0.9 * sx, -0.04, 2.11)]
        b.curve(f"Temple{side}", temple, "ShadesFrame", root, 0.022)
    bridge = [(-0.12, -0.775, 2.05), (0, -0.8, 2.08), (0.12, -0.775, 2.05)]
    b.curve("Bridge", bridge, "ShadesFrame", root, 0.024)


# ---- 산타 모자 -----------------------------------------------------------------


def build_santa_hat(b):
    """산타 모자: 흰 털 단 + 보는 사람 기준 오른쪽으로 늘어진 빨간 고깔 + 끝의 흰 방울. 산타 옷과 한 벌"""
    base_z = 2.38
    hat = b.empty("SantaHat", (0, 0, base_z), b.head())

    # 털 단: 겉을 울퉁불퉁하게 해 복슬복슬해 보이게 한다
    steps = 10
    fur = [
        (0.66 + 0.13 * math.cos(2 * math.pi * k / steps), 0.15 * math.sin(2 * math.pi * k / steps))
        for k in range(steps)
    ]
    bump = lambda theta, j: 1 + 0.035 * noise.noise(Vector((2.2 * math.cos(theta), 2.2 * math.sin(theta), 0.7 * j)))
    b.lathe("SantaBrim", fur + fur[:1], full_turn(40), ["SantaFur"], hat, (0, 0, base_z), sy=SY, mod=bump)

    # 고깔: 곧게 올라가다 옆으로 휘어 끝이 늘어진다. 고리마다 휘는 방향에 수직으로 세운다
    bend, rings_count, around = 0.7, 14, full_turn(24)
    bm = bmesh.new()
    rings = []
    for k in range(rings_count):
        t = 0.97 * k / (rings_count - 1)
        phi = math.radians(125) * t**1.4
        center = Vector((bend * (1 - math.cos(phi)), 0, base_z + 0.06 + bend * math.sin(phi)))
        across = Vector((math.cos(phi), 0, -math.sin(phi)))
        radius = 0.64 * (1 - t) ** 1.1 + 0.03
        rings.append(
            [bm.verts.new(center + across * (radius * math.cos(a)) + Vector((0, radius * math.sin(a) * SY, 0))) for a in around]
        )
    for lower, upper in zip(rings, rings[1:]):
        for i in range(len(around)):
            j = (i + 1) % len(around)
            bm.faces.new((lower[i], lower[j], upper[j], upper[i]))
    bm.faces.new(rings[-1])
    b.mesh("SantaCone", bm, ["SantaRed"], hat)

    # 방울
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1)
    for v in bm.verts:
        v.co = v.co * 0.17 * (1 + 0.1 * noise.noise(v.co * 1.7))
    b.mesh("SantaPom", bm, ["SantaFur"], hat, center + Vector((0.06, 0, -0.08)))


# ---- 산타 수염 -----------------------------------------------------------------


def build_santa_beard(b):
    """산타 수염: 턱과 볼을 감싸는 복슬복슬한 흰 수염 + 코 밑 콧수염. 산타 모자·산타 옷과 한 벌"""
    root = b.head()

    def tuft(name, loc, radii, rot=None, bumps=0.1):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1)
        for v in bm.verts:
            k = 1 + bumps * noise.noise(v.co * 2.1 + Vector(loc))
            v.co = Vector((v.co.x * radii[0] * k, v.co.y * radii[1] * k, v.co.z * radii[2] * k))
        return b.mesh(name, bm, ["SantaFur"], root, loc, rot)

    # 턱수염: 가운데 큰 덩어리와 양 볼 쪽 덩어리
    tuft("BeardChin", (0, -0.6, 1.48), (0.4, 0.22, 0.3))
    for side, sx in (("L", -1), ("R", 1)):
        tuft(f"BeardCheek{side}", (0.43 * sx, -0.46, 1.62), (0.21, 0.17, 0.24))
        tuft(f"BeardSide{side}", (0.24 * sx, -0.62, 1.54), (0.24, 0.18, 0.24))
        # 콧수염: 코 밑에서 양옆으로
        tuft(
            f"Mustache{side}", (0.15 * sx, -0.83, 1.75), (0.16, 0.06, 0.075),
            rot=(0, math.radians(14) * sx, math.radians(-10) * sx), bumps=0.06,
        )


# ---- 루돌프 뿔 · 코 -------------------------------------------------------------


def taper(b, name, start, end, r0, r1, mat, parent):
    """start 에서 end 로 뻗으며 가늘어지는, 양 끝이 둥근 막대 (뿔 가지)"""
    start, end = Vector(start), Vector(end)
    reach = end - start
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1)
    for v in bm.verts:
        t = (v.co.z + 1) / 2
        radius = r0 + (r1 - r0) * t
        v.co = Vector((v.co.x * radius, v.co.y * radius, t * reach.length + v.co.z * radius * 0.9))
    rot = Vector((0, 0, 1)).rotation_difference(reach.normalized()).to_euler()
    return b.mesh(name, bm, [mat], parent, start, rot=rot)


def build_rudolph_antlers(b):
    """루돌프 뿔: 빨간 머리띠에 달린, 가지가 둘씩 난 뿔 한 쌍. 루돌프 코·옷과 한 벌"""
    root = b.head()
    # 머리띠: 귀에서 귀까지 머리 위를 넘는다 (양 끝은 귀 뒤로 들어간다)
    band = []
    for k in range(9):
        a = math.radians(20 + 140 * k / 8)
        band.append((0.9 * math.cos(a), 0.0, 1.9 + 0.73 * math.sin(a)))
    b.curve("AntlerBand", band, "ClothRed", root, 0.04)
    for side, sx in (("L", -1), ("R", 1)):
        taper(b, f"Antler{side}", (0.36 * sx, 0, 2.5), (0.66 * sx, 0.02, 3.12), 0.085, 0.05, "Antler", root)
        taper(b, f"AntlerIn{side}", (0.47 * sx, 0, 2.74), (0.22 * sx, -0.06, 2.98), 0.06, 0.04, "Antler", root)
        taper(b, f"AntlerOut{side}", (0.57 * sx, 0.01, 2.94), (0.92 * sx, 0, 3.1), 0.055, 0.038, "Antler", root)


def build_rudolph_nose(b):
    """루돌프 코: 해달 코를 덮는 크고 빨간 코와 반짝임"""
    root = b.head()
    b.ell("RudolphNose", (0, -0.8, 1.85), (0.155, 0.14, 0.145), "RudolphNose", root, seg=20, rings=12)
    b.ell("RudolphNoseShine", (0.05, -0.925, 1.91), (0.04, 0.015, 0.03), "White", root, seg=8, rings=4)


OUTFITS = {
    "rudolph-antlers": build_rudolph_antlers,
    "rudolph-nose": build_rudolph_nose,
    "santa-beard": build_santa_beard,
    "santa-hat": build_santa_hat,
    "straw-hat": build_straw_hat,
    "captain-hat": build_captain_hat,
    "sunglasses": build_sunglasses,
    **outfit_clothes.OUTFITS,
}


def export(builder, path):
    for o in bpy.context.view_layer.objects:
        o.select_set(o.name in builder.col.objects)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
        export_cameras=False, export_lights=False, export_animations=False, export_texcoords=False,
        export_materials="EXPORT", export_extras=False, export_meshopt_compression_enable=True,
    )


def main(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for name, (base, shadow) in MATERIALS.items():
        make_material(name, base, shadow)
    for name, build in OUTFITS.items():
        builder = OutfitBuilder(f"Outfit-{name}")
        build(builder)
        bpy.context.view_layer.update()
        export(builder, os.path.join(out_dir, f"outfit-{name}.glb"))
        for o in list(builder.col.objects):
            bpy.data.objects.remove(o, do_unlink=True)


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1])
