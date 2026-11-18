"""3D 해달 모델(otter-3d.glb)을 Blender 에서 만드는 스크립트.

Blender 의 Python 콘솔(또는 MCP)에서 이 파일을 실행한 뒤 build() → export_glb(path) 를 부른다.
좌표는 Blender 기준 (Z 가 위, 해달은 -Y 를 바라본다, 보는 사람 기준 왼쪽이 -X).

노드 구조 (three.js 코드 otter-model.ts 가 이름으로 찾는다):
  OtterRoot
    FootL, FootR                    눈밭에 붙어 있는 발
    Torso                           일어설 때 위로 올라가는 부분
      Body, Belly, Scarf...
      Tail                          꼬리. 원점이 뿌리, 로컬 X 로 뻗는다 (일어서면 끝을 눈밭으로 내린다)
      LegL, LegR                    엉덩이가 원점, 로컬 Z 로 뻗은 다리 (발 위치까지 늘여 맞춘다)
      HeadPivot                     머리 (EyesOpen / EyesHappy 를 바꿔 보인다)
      ArmL, ArmR                    어깨가 원점, 로컬 Z 방향으로 뻗은 팔 (손 위치까지 늘여 맞춘다)
      HandL, HandR                  손
      RodPivot                      낚싯대 (GripL, GripR = 손 자리, RodTip = 줄이 시작하는 끝)
      Bucket                        물고기 양동이, 원점은 손잡이 꼭대기 (FishPile = 넘치는 물고기)
      HoldR, HoldL                  양동이를 들 때 손 자리 (오른손은 손잡이, 왼손은 배)
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

SCENE = "OtterDraft"
COLLECTION = "Otter"

# 재질 이름 → (밝은 면, 어두운 면). otter-model.ts 의 색과 맞춘다
TOON = {
    "Fur": ("#EDC9A0", "#D9AA80"),
    "Belly": ("#FBE7CF", "#EDCDAA"),
    "Hat": ("#4F7FC2", "#3B66A6"),
    "HatGroove": ("#3F6CB0", "#325A98"),
    "Scarf": ("#DE4B4E", "#BE3A3E"),
    "Nose": ("#86553E", "#6E4330"),
    "Pink": ("#E98C86", "#D9776F"),
    "Rod": ("#F5C88A", "#E3A866"),
    "Reel": ("#F3EBDD", "#D9CDB8"),
    "Bucket": ("#4A80C8", "#3A68AD"),
    "Goldfish": ("#F7B64A", "#E59A32"),
    "Bluefish": ("#8CC4EE", "#6AA8DA"),
}
FLAT = {"Eye": "#4A3226", "White": "#FFFFFF", "Line": "#7A4A33"}
OUTLINE = "#9A6644"
NO_OUTLINE = {"Belly", "Nose", "Pink", "Eye", "White", "Line"}

TAIL_LENGTH = 0.9  # 꼬리 뿌리에서 끝까지 (otter-model.ts 의 TAIL_LENGTH 와 같다)
RIBS = 24  # 모자 골 개수
RIB_OFFSETS = (0.0, 0.25, 0.44, 0.56, 0.75)  # 골 하나 안의 각도 분할 (0.44~0.56 이 파인 줄)


def lin(hex_color):
    h = hex_color.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c], 1.0)


def make_material(name, base, shadow):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    emi = nt.nodes.new("ShaderNodeEmission")
    ramp.color_ramp.interpolation = "CONSTANT"
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, lin(shadow)
    e[1].position, e[1].color = 0.22, lin(base)
    nt.links.new(dif.outputs[0], s2r.inputs[0])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], emi.inputs["Color"])
    nt.links.new(emi.outputs[0], out.inputs["Surface"])
    return m


def make_materials():
    for name, (base, shadow) in TOON.items():
        make_material(name, base, shadow)
    for name, color in FLAT.items():
        make_material(name, color, color)
    m = bpy.data.materials.get("Outline") or bpy.data.materials.new("Outline")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emi = nt.nodes.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = lin(OUTLINE)
    nt.links.new(emi.outputs[0], out.inputs["Surface"])
    m.use_backface_culling = True


class Builder:
    outline_name = "Outline"  # 테두리 재질 (Blender 미리보기용)

    def __init__(self, collection=COLLECTION):
        self.scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
        bpy.context.window.scene = self.scene
        col = bpy.data.collections.get(collection)
        if col is None:
            col = bpy.data.collections.new(collection)
            self.scene.collection.children.link(col)
        for o in list(col.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        self.col = col
        self.mats = bpy.data.materials

    # ---- 기본 도구 -------------------------------------------------------

    def link(self, obj, parent):
        self.col.objects.link(obj)
        if parent is not None:
            bpy.context.view_layer.update()
            obj.parent = parent
            obj.matrix_parent_inverse = parent.matrix_world.inverted()
        return obj

    def empty(self, name, loc, parent=None):
        e = bpy.data.objects.new(name, None)
        e.empty_display_size = 0.15
        e.location = loc
        return self.link(e, parent)

    def finish(self, obj, mats, outline=None, thick=0.018):
        """재질을 붙이고, 테두리(뒤집은 껍질)를 두른다. Blender 미리보기용이고 glb 에는 넣지 않는다"""
        for name in mats:
            obj.data.materials.append(self.mats[name])
        for poly in obj.data.polygons:
            poly.use_smooth = True
        if outline is None:
            outline = mats[0] not in NO_OUTLINE
        if outline:
            obj.data.materials.append(self.mats[self.outline_name])
            s = obj.modifiers.new("Outline", "SOLIDIFY")
            s.thickness = thick
            s.offset = 1.0
            s.use_flip_normals = True
            s.use_rim = False
            s.material_offset = len(mats)
        return obj

    def mesh(self, name, bm, mats, parent, loc=(0, 0, 0), rot=None, **kw):
        me = bpy.data.meshes.new(name)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(name, me)
        obj.location = loc
        if rot is not None:
            obj.rotation_euler = rot
        self.link(obj, parent)
        return self.finish(obj, mats, **kw)

    def ell(self, name, loc, radii, mat, parent, rot=None, seg=28, rings=14, shape=None, **kw):
        """타원체. shape(v) 로 꼭짓점을 더 다듬을 수 있다 (v 는 반지름 1 인 구 위의 점)"""
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1)
        for v in bm.verts:
            f = shape(v.co) if shape else (1, 1, 1)
            v.co = Vector((v.co.x * radii[0] * f[0], v.co.y * radii[1] * f[1], v.co.z * radii[2] * f[2]))
        return self.mesh(name, bm, [mat], parent, loc, rot, **kw)

    def curve(self, name, pts, mat, parent, depth=0.012):
        cu = bpy.data.curves.new(name, "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = depth
        cu.bevel_resolution = 1
        cu.use_fill_caps = True
        sp = cu.splines.new("NURBS")
        sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (*c, 1)
        sp.order_u = min(3, len(pts))
        sp.use_endpoint_u = True
        sp.resolution_u = 6
        obj = bpy.data.objects.new(name, cu)
        cu.materials.append(self.mats[mat])
        return self.link(obj, parent)

    def lathe(self, name, profile, thetas, mats, parent, loc, sy=1.0, mod=None, face_mat=None, **kw):
        """profile [(r, z)] 을 Z 축으로 돌려 만든 회전체. mod(theta, j) 는 반지름 배율, face_mat(i, j) 는 재질 번호"""
        bm = bmesh.new()
        grid = []
        for theta in thetas:
            ring = []
            for j, (r, z) in enumerate(profile):
                rr = r * (mod(theta, j) if mod else 1.0)
                ring.append(bm.verts.new((rr * math.cos(theta), rr * math.sin(theta) * sy, z)))
            grid.append(ring)
        n = len(thetas)
        for i in range(n):
            a, b = grid[i], grid[(i + 1) % n]
            for j in range(len(profile) - 1):
                face = bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
                if face_mat:
                    face.material_index = face_mat(i, j)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.004)
        return self.mesh(name, bm, mats, parent, loc, **kw)

    # ---- 몸 --------------------------------------------------------------

    def build_body(self):
        root = self.empty("OtterRoot", (0, 0, 0))
        torso = self.empty("Torso", (0, 0, 0), root)
        self.root, self.torso = root, torso

        # 서양배 모양: 엉덩이가 넓고 어깨로 갈수록 좁아진다 (공처럼 둥글지 않게)
        def pear(co):
            t = (co.z + 1) / 2
            s = min(max((t - 0.2) / 0.7, 0), 1)
            s = s * s * (3 - 2 * s)
            k = 1.1 + (0.74 - 1.1) * s
            return (k, k, 1)

        self.ell("Body", (0, 0, 0.78), (0.74, 0.64, 0.84), "Fur", torso, shape=pear, seg=32, rings=18)
        self.ell("Belly", (0, -0.36, 0.64), (0.46, 0.34, 0.52), "Belly", torso, shape=pear)

        # 꼬리: 엉덩이 뒤에서 오른쪽 뒤로 뻗는다. 원점이 꼬리 뿌리(몸 안)이고 로컬 X 로 뻗어,
        # 일어설 때 뿌리를 축으로 끝을 눈밭까지 내릴 수 있다 (몸에서 떨어져 보이지 않게)
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=14, radius=1)
        for v in bm.verts:
            t = (v.co.z + 1) / 2
            radius = 0.2 + (0.075 - 0.2) * t**0.8
            v.co = Vector((t * TAIL_LENGTH + v.co.z * 0.05, v.co.y * radius, v.co.x * radius * 0.62))
        self.mesh("Tail", bm, ["Fur"], torso, (0.38, 0.2, 0.13), rot=(0, 0, math.radians(20)))

        wide_toes = lambda co: (1 + 0.16 * max(-co.y, 0) - 0.12 * max(co.y, 0), 1, 1)
        for side, sx in (("L", -1), ("R", 1)):
            center = Vector((0.4 * sx, -0.46, 0.16))
            foot = self.empty(f"Foot{side}", center, root)
            self.ell(f"FootMesh{side}", center, (0.23, 0.31, 0.17), "Fur", foot, shape=wide_toes)
            for tx in (-0.07, 0.07):
                fx = center.x + tx
                pts = [(fx, -0.75, 0.24), (fx, -0.785, 0.16), (fx, -0.765, 0.08)]
                self.curve(f"Toe{side}{tx:+.2f}", pts, "Line", foot, 0.008)

            # 다리: 엉덩이(몸 안)가 원점, 로컬 Z 로 발까지 뻗는다. 앉아 있을 때는 몸과 발에 가려 있고,
            # 일어서면 코드가 발까지 늘여 맞춰 짧은 다리로 보인다
            hip = Vector((0.3 * sx, -0.12, 0.32))
            reach = center + Vector((0, 0, 0.02)) - hip
            bm = bmesh.new()
            bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1)
            for v in bm.verts:
                t = (v.co.z + 1) / 2
                radius = 0.2 + (0.15 - 0.2) * t
                v.co = Vector((v.co.x * radius, v.co.y * radius, t * reach.length + v.co.z * 0.05))
            rot = Vector((0, 0, 1)).rotation_difference(reach.normalized()).to_euler()
            self.mesh(f"Leg{side}", bm, ["Fur"], torso, hip, rot=rot)

        # 목도리
        scarf_profile, n = [], 14
        for k in range(n + 1):
            a = 2 * math.pi * k / n
            scarf_profile.append((0.5 + 0.13 * math.cos(a), 0.14 * math.sin(a)))
        thetas = [2 * math.pi * i / 40 for i in range(40)]
        self.lathe("Scarf", scarf_profile[:-1] + scarf_profile[:1], thetas, ["Scarf"], torso, (0, -0.02, 1.33), sy=0.92)
        self.ell("ScarfKnot", (0.2, -0.56, 1.25), (0.14, 0.1, 0.12), "Scarf", torso)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=2, use_grid_fill=True)
        for v in bm.verts:
            c = Vector((v.co.x * 2, v.co.y * 2, v.co.z * 2))
            k = max(abs(c.x), abs(c.y), abs(c.z)) / max(c.length, 1e-6)
            c = c * (0.35 + 0.65 * k)  # 모서리를 둥글린다
            v.co = Vector((c.x * 0.11, c.y * 0.045, c.z * 0.23))
        self.mesh(
            "ScarfTail", bm, ["Scarf"], torso, (0.27, -0.66, 1.0), rot=(math.radians(-14), math.radians(-10), 0)
        )

    # ---- 머리 ------------------------------------------------------------

    def build_head(self):
        torso = self.torso
        head = self.empty("HeadPivot", (0, 0, 1.3), torso)
        self.head = head
        HC, HR = (0, 0, 1.9), (0.88, 0.74, 0.7)
        MC, MR = (0, -0.6, 1.76), (0.36, 0.22, 0.21)

        def surf_y(c, r, x, z, off=0.008):
            t = 1 - ((x - c[0]) / r[0]) ** 2 - ((z - c[2]) / r[2]) ** 2
            return c[1] - r[1] * math.sqrt(max(t, 0)) - off

        self.ell("Head", HC, HR, "Fur", head, seg=32, rings=18)
        self.ell("Muzzle", MC, MR, "Belly", head)
        self.ell("Nose", (0, surf_y(MC, MR, 0, 1.85, -0.04), 1.85), (0.12, 0.07, 0.085), "Nose", head, seg=16, rings=8)
        eyes_open = self.empty("EyesOpen", (0, 0, 1.98), head)
        eyes_happy = self.empty("EyesHappy", (0, 0, 1.98), head)
        for side, sx in (("L", -1), ("R", 1)):
            ex, ez = 0.32 * sx, 1.98
            ey = surf_y(HC, HR, ex, ez, -0.015)
            self.ell(f"Eye{side}", (ex, ey, ez), (0.075, 0.04, 0.09), "Eye", eyes_open, seg=16, rings=8)
            self.ell(
                f"EyeHi{side}", (ex + 0.022, ey - 0.035, ez + 0.032), (0.024, 0.012, 0.024), "White", eyes_open,
                seg=8, rings=4,
            )
            # 웃는 눈 (^ ^): 물고기를 잡았을 때·양동이를 들었을 때
            arc = []
            for dx, dz in ((-0.1, -0.03), (-0.05, 0.05), (0.05, 0.05), (0.1, -0.03)):
                arc.append((ex + dx, surf_y(HC, HR, ex + dx, ez + dz, 0.012), ez + dz))
            self.curve(f"EyeHappy{side}", arc, "Line", eyes_happy, 0.016)

            # 귀: 머리 위쪽 옆, 모자 단 바로 아래에서 바깥 위로 쫑긋 선다
            tilt = (0, math.radians(28) * sx, 0)
            self.ell(f"Ear{side}", (0.83 * sx, -0.02, 2.14), (0.17, 0.09, 0.2), "Fur", head, rot=tilt, seg=20, rings=10)
            self.ell(
                f"EarIn{side}", (0.85 * sx, -0.085, 2.14), (0.095, 0.04, 0.12), "Pink", head, rot=tilt, seg=16, rings=8
            )
            pts = [(x, surf_y(MC, MR, x, z), z) for x, z in [(0, 1.72), (0.05 * sx, 1.66), (0.13 * sx, 1.67), (0.18 * sx, 1.73)]]
            self.curve(f"Mouth{side}", pts, "Line", head, 0.012)
            for dz in (0.05, -0.05):
                pts = [
                    (x * sx, surf_y(HC, HR, x, 1.8 + dz * k, 0.0) - 0.02 * k, 1.8 + dz * k)
                    for k, x in enumerate((0.42, 0.66, 0.98))
                ]
                self.curve(f"Whisker{side}{dz:+.2f}", pts, "Line", head, 0.008)
        pts = [(0, surf_y(MC, MR, 0, z), z) for z in (1.79, 1.76, 1.72)]
        self.curve("MouthStem", pts, "Line", head, 0.012)
        self.build_hat(head)

    def build_hat(self, head, mats=("Hat", "HatGroove"), cuff_z=2.38, s=1.0, prefix=""):
        """털모자: 골이 진 접은 단 + 세로 골이 있는 뜨개 모자 + 복슬복슬한 방울.
        cuff_z 는 접은 단의 높이, s 는 크기 배율 (눈사람 모자도 이걸로 만든다)"""
        mats = list(mats)
        period = 2 * math.pi / RIBS
        thetas = [(k + o) * period for k in range(RIBS) for o in RIB_OFFSETS]
        n_off = len(RIB_OFFSETS)
        rib = lambda theta: math.cos(RIBS * theta)  # 1 = 볼록, -1 = 파인 줄 (각 골의 가운데)

        # 접은 단: 둥근 네모 단면
        R, a, b, steps = 0.67 * s, 0.105 * s, 0.16 * s, 12
        cuff, weight = [], []
        for k in range(steps + 1):
            psi = 2 * math.pi * k / steps
            c, sn = math.cos(psi), math.sin(psi)
            cuff.append((R + a * math.copysign(abs(c) ** 0.6, c), b * math.copysign(abs(sn) ** 0.6, sn)))
            weight.append(max(c, 0.0))
        self.lathe(
            prefix + "HatCuff", cuff, thetas, mats, head, (0, 0.0, cuff_z), sy=0.9,
            mod=lambda th, j: 1 + 0.035 * weight[j] * rib(th),
            face_mat=lambda i, j: 1 if i % n_off == 2 and (weight[j] > 0.2 or weight[j + 1] > 0.2) else 0,
        )

        # 모자 몸통: 반 타원체, 세로 골은 위로 갈수록 옅어진다
        rings, rx, height = 9, 0.7 * s, 0.56 * s
        dome, fade = [], []
        for k in range(rings + 1):
            phi = (math.pi / 2) * k / rings
            dome.append((max(rx * math.cos(phi), 0.001), height * math.sin(phi)))
            fade.append(math.cos(phi))
        self.lathe(
            prefix + "HatDome", dome, thetas, mats, head, (0, 0.01 * s, cuff_z + 0.08 * s), sy=0.9,
            mod=lambda th, j: 1 + 0.03 * fade[j] * rib(th),
            face_mat=lambda i, j: 1 if i % n_off == 2 and (i // n_off) % 2 == 0 and j < rings - 2 else 0,
        )

        # 방울: 울퉁불퉁하게 부풀려 복슬복슬해 보이게
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1)
        for v in bm.verts:
            bump = 1 + 0.1 * noise.noise(v.co * 1.7)
            v.co = v.co * 0.25 * s * bump
        self.mesh(prefix + "PomPom", bm, mats[:1], head, (0.1 * s, 0.03 * s, cuff_z + 0.72 * s))

    # ---- 팔·손·낚싯대 ------------------------------------------------------

    def build_arms(self):
        torso = self.torso
        GRIP = Vector((0.0, -0.76, 0.84))
        TIP = Vector((-2.4, -0.82, 1.3))
        along = (TIP - GRIP).normalized()

        rodp = self.empty("RodPivot", GRIP, torso)
        start = GRIP - along * 0.35
        d = TIP - start
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.04, radius2=0.018, depth=d.length)
        rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
        self.mesh("Rod", bm, ["Rod"], rodp, (start + TIP) / 2, rot=rot, thick=0.012)
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.1, radius2=0.1, depth=0.06)
        self.mesh("Reel", bm, ["Reel"], rodp, GRIP + along * 0.42 + Vector((0, 0, -0.1)), rot=(math.radians(90), 0, 0), thick=0.012)
        ring = [(0.035 + 0.012 * math.cos(2 * math.pi * k / 6), 0.012 * math.sin(2 * math.pi * k / 6)) for k in range(7)]
        ring_obj = self.lathe("RodRing", ring, [2 * math.pi * i / 12 for i in range(12)], ["Rod"], rodp, TIP, thick=0.008)
        ring_obj.rotation_euler = (math.radians(90), 0, 0)
        self.empty("RodTip", TIP, rodp)

        # 손 자리: 왼손은 낚싯대 앞쪽, 오른손은 뒤쪽을 쥔다
        grips = {"L": GRIP + along * 0.17, "R": GRIP - along * 0.13}
        shoulders = {"L": Vector((-0.44, -0.2, 1.12)), "R": Vector((0.44, -0.2, 1.12))}
        for side in ("L", "R"):
            self.empty(f"Grip{side}", grips[side], rodp)
            hand = self.empty(f"Hand{side}", grips[side], torso)
            self.ell(f"Paw{side}", grips[side], (0.15, 0.13, 0.135), "Fur", hand, seg=20, rings=10)
            for dx in (-0.05, 0.05):
                g = grips[side]
                pts = [(g.x + dx, g.y - 0.118, g.z + 0.06), (g.x + dx, g.y - 0.136, g.z), (g.x + dx, g.y - 0.118, g.z - 0.06)]
                self.curve(f"Finger{side}{dx:+.2f}", pts, "Line", hand, 0.007)

            # 팔: 어깨가 원점, 로컬 Z 로 뻗는다. 어깨 쪽이 굵고 손목 쪽이 가늘다
            reach = grips[side] - shoulders[side]
            length = reach.length
            bm = bmesh.new()
            bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
            for v in bm.verts:
                t = (v.co.z + 1) / 2
                radius = 0.185 + (0.125 - 0.185) * t
                v.co = Vector((v.co.x * radius, v.co.y * radius, t * length + v.co.z * 0.06))
            rot = Vector((0, 0, 1)).rotation_difference(reach.normalized()).to_euler()
            self.mesh(f"Arm{side}", bm, ["Fur"], torso, shoulders[side], rot=rot)

    # ---- 양동이 ------------------------------------------------------------

    def build_bucket(self):
        torso = self.torso
        # 낚시하는 동안에는 코드가 양동이를 오른쪽 눈밭에 내려놓는다. 여기 자리는 들었을 때의 자리다
        top = Vector((1.22, -0.36, 1.52))  # 손잡이 꼭대기 (오른손이 쥐는 곳)
        bucket = self.empty("Bucket", top, torso)
        self.empty("HoldR", top, torso)
        self.empty("HoldL", (-0.1, -0.66, 0.74), torso)  # 왼손은 배에 얹는다
        rim_z, bottom_z, r_top, r_bottom = -0.4, -0.92, 0.37, 0.29
        thetas = [2 * math.pi * i / 28 for i in range(28)]
        profile = [(0.001, bottom_z), (r_bottom, bottom_z), (r_top, rim_z), (0.001, rim_z - 0.03)]
        self.lathe("BucketBody", profile, thetas, ["Bucket"], bucket, top)
        rim = [(r_top + 0.01 + 0.04 * math.cos(2 * math.pi * k / 8), 0.04 * math.sin(2 * math.pi * k / 8)) for k in range(9)]
        self.lathe("BucketRim", rim, thetas, ["Bucket"], bucket, top + Vector((0, 0, rim_z)))
        arc = []
        for k in range(9):
            a = math.pi * k / 8
            arc.append((top.x - r_top * math.cos(a), top.y, top.z + rim_z + (-rim_z) * math.sin(a)))
        handle = self.curve("BucketHandle", arc, "Bucket", bucket, 0.028)
        handle.data.bevel_resolution = 2

        # 양동이 위로 넘치는 물고기 (가득 찼을 때만 FishPile 을 키워 보인다)
        pile = self.empty("FishPile", top + Vector((0, 0, rim_z)), bucket)
        fish = [
            ("Bluefish", (-0.16, -0.12, 0.06), 25, 20),
            ("Goldfish", (0.14, -0.14, 0.04), -30, 160),
            ("Bluefish", (0.12, 0.12, 0.08), 20, 200),
            ("Goldfish", (-0.12, 0.14, 0.1), -20, 30),
            ("Goldfish", (0.0, -0.02, 0.15), 10, 90),
        ]
        for i, (mat, off, pitch, yaw) in enumerate(fish):
            center = top + Vector((off[0], off[1], rim_z + off[2]))
            holder = self.empty(f"Fish{i}", center, pile)
            holder.rotation_euler = (0, math.radians(pitch), math.radians(yaw))
            bpy.context.view_layer.update()
            m = holder.matrix_world

            def place(obj, local):
                obj.matrix_world = m @ Matrix.Translation(local)
                return obj

            body = self.ell(f"FishBody{i}", (0, 0, 0), (0.17, 0.07, 0.1), mat, holder, seg=16, rings=8)
            place(body, Vector((0, 0, 0)))
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.085, radius2=0.01, depth=0.13)
            for v in bm.verts:
                v.co.y *= 0.35
            tail = self.mesh(f"FishTail{i}", bm, [mat], holder)
            tail.matrix_world = m @ Matrix.Translation(Vector((0.2, 0, 0))) @ Matrix.Rotation(math.radians(-90), 4, "Y")
            for sy in (-1, 1):
                eye = self.ell(f"FishEye{i}{sy:+d}", (0, 0, 0), (0.022, 0.012, 0.022), "Eye", holder, seg=8, rings=4)
                place(eye, Vector((-0.09, 0.062 * sy, 0.02)))


def build():
    make_materials()
    b = Builder()
    b.build_body()
    b.build_head()
    b.build_arms()
    b.build_bucket()
    bpy.context.view_layer.update()
    return b


def export_glb(path, collection=COLLECTION):
    """테두리 껍질은 빼고 내보낸다 (테두리는 three.js 가 그린다)"""
    col = bpy.data.collections[collection]
    outlines = [m for o in col.objects for m in o.modifiers if m.name == "Outline"]
    for m in outlines:
        m.show_viewport = False
    bpy.ops.object.select_all(action="DESELECT")
    for o in col.objects:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
        export_cameras=False, export_lights=False, export_animations=False, export_texcoords=False,
        export_materials="EXPORT", export_extras=False, export_meshopt_compression_enable=True,
    )
    for m in outlines:
        m.show_viewport = True
