"""해달 친구인 눈사람 3D 모델(snowman-3d.glb)을 Blender 에서 만드는 스크립트.

build_otter.py 를 먼저 실행한 같은 이름공간에서 실행한다 (Builder 와 재질 도구를 같이 쓴다).
그 뒤 build_snowman() → export_glb(path, SNOWMAN_COLLECTION) 을 부른다.
좌표는 Blender 기준 (Z 가 위, 눈사람은 -Y 를 바라본다, 보는 사람 기준 왼쪽이 -X).

노드 구조 (three.js 코드 snowman-model.ts 가 이름으로 찾는다):
  SnowRoot
    SnowBody, 단추, 목도리
    SnowArmL, SnowArmR            어깨가 원점인 나뭇가지 팔 (가로로 뻗은 모습이 기본)
    SnowHead                      머리 (모자, 볼, 코)
      SnowEyesOpen / SnowEyesHappy / SnowBrows / SnowBrowsSad   눈·눈썹 (바꿔 보인다)
      SnowMouthSmile / SnowMouthO / SnowMouthFrown / SnowMouthOpen   입 (바꿔 보인다)
    SnowFxHeart / SnowFxNotice / SnowFxSweat / SnowFxSparkle        머리 옆에 뜨는 표시
  SnowPuddle                      녹을 때 발밑에 번지는 물웅덩이 (눈사람 자세를 따라 찌그러지지 않게 따로 둔다)
  SnowIce                         얼릴 때 둘레에 솟는 얼음 조각 (SnowIce0~4)
"""

SNOWMAN_COLLECTION = "Snowman"

SNOW_TOON = {
    "Snow": ("#FBFAF8", "#DDE4F0"),
    "SnowHat": ("#F2C14E", "#E0A93A"),
    "SnowHatGroove": ("#DDA83A", "#C8922E"),
    "SnowScarf": ("#4F70AE", "#3F5C96"),
    "Carrot": ("#F4A340", "#E08A2C"),
    "Twig": ("#9A6B4F", "#84573D"),
    "MouthIn": ("#E8837C", "#E8837C"),
    "Tongue": ("#F6AFA6", "#F6AFA6"),
    "Heart": ("#F28B8B", "#E27272"),
    "Sweat": ("#C6DDF4", "#A9C9EA"),
    "Spark": ("#F8CC4C", "#EDB93A"),
    "Puddle": ("#C4E2F5", "#AED3EC"),
    "Ice": ("#DDF3FF", "#BCE3F8"),
}
SNOW_FLAT = {"Button": "#7A6A5E", "Cheek": "#F7D3CE"}
SNOW_OUTLINE = "#8094B8"
NO_OUTLINE.update({"Twig", "Button", "Cheek", "Tongue"})

BODY_C, BODY_R = (0, 0, 0.66), (0.8, 0.74, 0.68)
HEAD_C, HEAD_R = (0, 0, 1.52), (0.62, 0.58, 0.56)


def front_y(c, r, x, z, off=0.008):
    """타원체 앞면(-Y)의 y. off 만큼 바깥으로 띄운다"""
    t = 1 - ((x - c[0]) / r[0]) ** 2 - ((z - c[2]) / r[2]) ** 2
    return c[1] - r[1] * math.sqrt(max(t, 0)) - off


class SnowmanBuilder(Builder):
    outline_name = "SnowOutline"

    def build_body(self):
        root = self.empty("SnowRoot", (0, 0, 0))
        self.root = root
        self.ell("SnowBody", BODY_C, BODY_R, "Snow", root, seg=32, rings=18)
        for i, z in enumerate((0.8, 0.54)):
            y = front_y(BODY_C, BODY_R, 0.02, z, 0.0)
            self.ell(f"SnowButton{i}", (0.02, y, z), (0.055, 0.03, 0.055), "Button", root, seg=12, rings=6)

        # 목도리: 머리와 몸 사이를 두르고, 끝이 오른쪽 앞으로 늘어진다
        n = 12
        ring = [(0.5 + 0.13 * math.cos(2 * math.pi * k / n), 0.13 * math.sin(2 * math.pi * k / n)) for k in range(n)]
        thetas = [2 * math.pi * i / 36 for i in range(36)]
        self.lathe("SnowScarf", ring + ring[:1], thetas, ["SnowScarf"], root, (0, 0, 1.12), sy=0.95)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=2, use_grid_fill=True)
        for v in bm.verts:
            c = v.co * 2
            k = max(abs(c.x), abs(c.y), abs(c.z)) / max(c.length, 1e-6)
            c = c * (0.35 + 0.65 * k)
            v.co = Vector((c.x * 0.13, c.y * 0.055, c.z * 0.25))
        self.mesh(
            "SnowScarfTail", bm, ["SnowScarf"], root, (0.34, -0.52, 0.9), rot=(math.radians(-22), math.radians(-6), 0)
        )

        # 나뭇가지 팔: 어깨에서 바깥으로 뻗고, 끝에 잔가지 두 개
        for side, sx in (("L", -1), ("R", 1)):
            shoulder = Vector((0.66 * sx, -0.05, 1.0))
            arm = self.empty(f"SnowArm{side}", shoulder, root)
            out = Vector((sx, 0, 0))
            self.twig(f"SnowTwig{side}", arm, shoulder - out * 0.12, out, 0.62, 0.036, 0.022)
            for j, deg in enumerate((38, -38)):
                a = math.radians(deg)
                d = Vector((sx * math.cos(a), 0, math.sin(a)))
                self.twig(f"SnowTwig{side}{j}", arm, shoulder + out * 0.32, d, 0.17, 0.022, 0.014)

    def twig(self, name, parent, start, direction, length, r1, r2):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=r1, radius2=r2, depth=length)
        rot = Vector((0, 0, 1)).rotation_difference(direction.normalized()).to_euler()
        return self.mesh(name, bm, ["Twig"], parent, start + direction.normalized() * (length / 2), rot=rot)

    def build_head(self):
        head = self.empty("SnowHead", (0, 0, 1.1), self.root)
        self.head = head
        self.ell("SnowHeadBall", HEAD_C, HEAD_R, "Snow", head, seg=32, rings=18)
        fy = lambda x, z, off=0.008: front_y(HEAD_C, HEAD_R, x, z, off)

        for side, sx in (("L", -1), ("R", 1)):
            self.ell(f"SnowCheek{side}", (0.4 * sx, fy(0.4 * sx, 1.42, -0.01), 1.42), (0.1, 0.03, 0.07), "Cheek", head, seg=12, rings=6)

        # 당근 코: 앞으로, 살짝 오른쪽 위로 뻗는다
        direction = Vector((0.28, -1, 0.12)).normalized()
        base = Vector((0.03, fy(0.03, 1.5, -0.03), 1.5))
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.085, radius2=0.02, depth=0.3)
        rot = Vector((0, 0, 1)).rotation_difference(direction).to_euler()
        self.mesh("SnowNose", bm, ["Carrot"], head, base + direction * 0.15, rot=rot, thick=0.012)

        # 눈: 동그란 눈 / 웃는 눈(^ ^) / 찡그린 눈썹
        eyes_open = self.empty("SnowEyesOpen", HEAD_C, head)
        eyes_happy = self.empty("SnowEyesHappy", HEAD_C, head)
        brows = self.empty("SnowBrows", HEAD_C, head)
        brows_sad = self.empty("SnowBrowsSad", HEAD_C, head)
        for side, sx in (("L", -1), ("R", 1)):
            ex, ez = 0.26 * sx, 1.6
            self.ell(f"SnowEye{side}", (ex, fy(ex, ez, -0.012), ez), (0.066, 0.035, 0.072), "Eye", eyes_open, seg=14, rings=7)
            arc = [(ex + dx, fy(ex + dx, ez + dz, 0.012), ez + dz) for dx, dz in ((-0.09, -0.03), (-0.045, 0.045), (0.045, 0.045), (0.09, -0.03))]
            self.curve(f"SnowEyeHappy{side}", arc, "Line", eyes_happy, 0.015)
            brow = [(ex + dx * sx, fy(ex + dx * sx, ez + dz, 0.012), ez + dz) for dx, dz in ((0.1, 0.15), (0.0, 0.13), (-0.09, 0.08))]
            self.curve(f"SnowBrow{side}", brow, "Line", brows, 0.014)
            # 걱정하는 눈썹 (녹을 때): 안쪽이 올라간다
            sad = [(ex + dx * sx, fy(ex + dx * sx, ez + dz, 0.012), ez + dz) for dx, dz in ((0.1, 0.09), (0.0, 0.14), (-0.09, 0.16))]
            self.curve(f"SnowBrowSad{side}", sad, "Line", brows_sad, 0.014)

        # 입: 미소 / 놀란 입(o) / 삐죽 / 활짝
        mz = 1.34
        smile = self.empty("SnowMouthSmile", HEAD_C, head)
        pts = [(x, fy(x, z, 0.012), z) for x, z in ((-0.1, mz + 0.04), (-0.04, mz - 0.02), (0.04, mz - 0.02), (0.1, mz + 0.04))]
        self.curve("SnowSmileLine", pts, "Line", smile, 0.014)
        frown = self.empty("SnowMouthFrown", HEAD_C, head)
        pts = [(x, fy(x, z, 0.012), z) for x, z in ((-0.09, mz - 0.03), (-0.03, mz + 0.025), (0.03, mz + 0.025), (0.09, mz - 0.03))]
        self.curve("SnowFrownLine", pts, "Line", frown, 0.014)
        mouth_o = self.empty("SnowMouthO", HEAD_C, head)
        self.ell("SnowMouthOBall", (0.03, fy(0.03, mz - 0.01, -0.01), mz - 0.01), (0.045, 0.03, 0.058), "MouthIn", mouth_o, seg=14, rings=7, thick=0.01)
        mouth_open = self.empty("SnowMouthOpen", HEAD_C, head)
        flat_top = lambda co: (1, 1, 0.3 if co.z > 0 else 1)
        self.ell(
            "SnowMouthOpenBall", (0, fy(0, mz, -0.012), mz + 0.03), (0.115, 0.04, 0.14), "MouthIn", mouth_open,
            seg=18, rings=10, shape=flat_top, thick=0.01,
        )
        self.ell("SnowTongue", (0, fy(0, mz - 0.06, 0.0) - 0.022, mz - 0.06), (0.07, 0.02, 0.045), "Tongue", mouth_open, seg=12, rings=6)

        # 모자: 머리 위에 왼쪽으로 살짝 기울여 쓴다
        hat = self.empty("SnowHat", HEAD_C, head)
        self.build_hat(hat, mats=("SnowHat", "SnowHatGroove"), cuff_z=1.96, s=0.64, prefix="Snow")
        hat.rotation_euler = (math.radians(5), math.radians(-9), 0)

    def build_effects(self):
        root = self.root
        at = Vector((0.74, -0.3, 2.02))  # 머리 오른쪽 위

        heart = self.empty("SnowFxHeart", at, root)
        for i, deg in enumerate((32, -32)):
            lobe = at + Vector((0.055 if deg > 0 else -0.055, 0, 0))
            self.ell(f"SnowHeartLobe{i}", lobe, (0.075, 0.055, 0.115), "Heart", heart, rot=(0, math.radians(deg), 0), seg=14, rings=8, thick=0.012)

        notice = self.empty("SnowFxNotice", at, root)
        for i, deg in enumerate((15, 50, 85)):
            a = math.radians(deg)
            d = Vector((math.sin(a), 0, math.cos(a)))
            rot = Vector((0, 0, 1)).rotation_difference(d).to_euler()
            self.ell(f"SnowNoticeDash{i}", at + d * 0.16, (0.03, 0.03, 0.085), "Spark", notice, rot=rot, seg=10, rings=6, thick=0.01)

        sweat = self.empty("SnowFxSweat", at, root)
        pointy = lambda co: ((1 - 0.75 * co.z, 1 - 0.75 * co.z, 1.35) if co.z > 0 else (1, 1, 1))
        for i, (dx, dz, k) in enumerate(((0.0, 0.06, 1.0), (0.14, -0.08, 0.72))):
            self.ell(
                f"SnowSweatDrop{i}", at + Vector((dx, 0, dz)), (0.06 * k, 0.045 * k, 0.07 * k), "Sweat", sweat,
                rot=(0, math.radians(-25), 0), seg=12, rings=8, shape=pointy, thick=0.01,
            )

        sparkle = self.empty("SnowFxSparkle", at, root)
        for i, (pos, r) in enumerate((((0.8, -0.3, 1.92), 0.13), ((0.6, -0.3, 2.28), 0.085), ((-0.84, -0.3, 1.62), 0.09))):
            self.star(f"SnowStar{i}", sparkle, Vector(pos), r)

    def build_melt_parts(self):
        """녹을 때의 물웅덩이와 얼릴 때의 얼음 조각. 코드가 크기를 바꿔 나타내고 숨긴다"""
        # 물웅덩이: 가장자리가 울퉁불퉁한 납작한 판
        thetas = [2 * math.pi * i / 40 for i in range(40)]
        wavy = lambda th, j: 1 + 0.07 * math.cos(3 * th + 0.6) + 0.05 * math.cos(5 * th)
        profile = [(0.001, 0.035), (0.92, 0.035), (1.05, 0.012), (1.08, 0.0)]
        self.lathe("SnowPuddle", profile, thetas, ["Puddle"], None, (0, -0.05, 0), sy=0.8, mod=wavy, thick=0.012)

        # 얼음 조각: 위아래가 뾰족한 육각 기둥. 눈사람 둘레에 비스듬히 솟는다
        ice = self.empty("SnowIce", (0, 0, 0))
        shards = [
            ((-0.95, -0.25, 0.0), 0.62, 0.16, -22),
            ((-0.62, -0.5, 0.0), 0.36, 0.11, -8),
            ((0.98, -0.2, 0.0), 0.7, 0.17, 20),
            ((0.6, -0.52, 0.0), 0.4, 0.12, 10),
            ((0.1, -0.7, 0.0), 0.28, 0.1, -4),
        ]
        for i, (base, height, radius, lean) in enumerate(shards):
            bm = bmesh.new()
            ring_low = [bm.verts.new((radius * math.cos(k * math.pi / 3), radius * math.sin(k * math.pi / 3), height * 0.12)) for k in range(6)]
            ring_high = [bm.verts.new((radius * math.cos(k * math.pi / 3), radius * math.sin(k * math.pi / 3), height * 0.7)) for k in range(6)]
            bottom = bm.verts.new((0, 0, 0))
            tip = bm.verts.new((0, 0, height))
            for k in range(6):
                n = (k + 1) % 6
                bm.faces.new((ring_low[k], ring_low[n], ring_high[n], ring_high[k]))
                bm.faces.new((ring_low[n], ring_low[k], bottom))
                bm.faces.new((ring_high[k], ring_high[n], tip))
            shard = self.mesh(f"SnowIce{i}", bm, ["Ice"], ice, base, rot=(0, math.radians(lean), 0), thick=0.012)
            for poly in shard.data.polygons:
                poly.use_smooth = False

    def star(self, name, parent, center, radius):
        """네 갈래 반짝이 (앞뒤로 살짝 도톰한 별)"""
        bm = bmesh.new()
        rim = []
        for k in range(8):
            a = math.pi / 2 * k / 2
            r = radius if k % 2 == 0 else radius * 0.32
            rim.append(bm.verts.new((r * math.sin(a), 0, r * math.cos(a))))
        front = bm.verts.new((0, -radius * 0.28, 0))
        back = bm.verts.new((0, radius * 0.28, 0))
        for k in range(8):
            a, b = rim[k], rim[(k + 1) % 8]
            bm.faces.new((a, b, front))
            bm.faces.new((b, a, back))
        obj = self.mesh(name, bm, ["Spark"], parent, center, thick=0.01)
        for poly in obj.data.polygons:
            poly.use_smooth = False
        return obj


def build_snowman():
    for name, (base, shadow) in SNOW_TOON.items():
        make_material(name, base, shadow)
    for name, color in SNOW_FLAT.items():
        make_material(name, color, color)
    make_materials()  # Eye, Line 과 기본 테두리
    outline = bpy.data.materials["Outline"].copy()
    old = bpy.data.materials.get("SnowOutline")
    if old:
        bpy.data.materials.remove(old)
    outline.name = "SnowOutline"
    emission = next(n for n in outline.node_tree.nodes if n.type == "EMISSION")
    emission.inputs["Color"].default_value = lin(SNOW_OUTLINE)
    b = SnowmanBuilder(SNOWMAN_COLLECTION)
    b.build_body()
    b.build_head()
    b.build_effects()
    b.build_melt_parts()
    bpy.context.view_layer.update()
    return b
