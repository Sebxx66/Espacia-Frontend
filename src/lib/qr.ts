// Generador de códigos QR sin dependencias (modo byte, corrección M, versiones 1 a 5:
// alcanza para direcciones de hasta ~80 caracteres). Devuelve una matriz de 0 (claro) y 1 (oscuro).

const ECC: Record<number, [number, number]> = { 1: [10, 1], 2: [16, 1], 3: [26, 1], 4: [18, 2], 5: [24, 2] };
const TOTAL: Record<number, number> = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134 };
const ALIGN: Record<number, number[]> = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30] };

const EXP: number[] = [];
const LOG: number[] = [];
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

const gmul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsRemainder(data: number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i++) {
    const g = new Array<number>(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      g[j] ^= gen[j];
      g[j + 1] ^= gmul(gen[j], EXP[i]);
    }
    gen = g;
  }
  const r = new Array<number>(n).fill(0);
  for (const b of data) {
    const f = b ^ r[0];
    r.shift();
    r.push(0);
    for (let k = 0; k < n; k++) r[k] ^= gmul(gen[k + 1], f);
  }
  return r;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

export function qrMatrix(text: string): number[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 0;
  for (let v = 1; v <= 5; v++) {
    if (bytes.length <= TOTAL[v] - ECC[v][0] * ECC[v][1] - 2) {
      ver = v;
      break;
    }
  }
  if (!ver) throw new Error("Texto demasiado largo para el QR");

  const [eccLen, blocksCount] = ECC[ver];
  const dataCw = TOTAL[ver] - eccLen * blocksCount;
  const bits: number[] = [];
  const put = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  put(4, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let x = 0;
    for (let j = 0; j < 8; j++) x = (x << 1) | bits[i + j];
    cw.push(x);
  }
  for (let pad = 0xec; cw.length < dataCw; pad ^= 0xec ^ 0x11) cw.push(pad);

  const per = dataCw / blocksCount;
  const blocks: number[][] = [];
  const eccs: number[][] = [];
  for (let i = 0; i < blocksCount; i++) {
    const d = cw.slice(i * per, (i + 1) * per);
    blocks.push(d);
    eccs.push(rsRemainder(d, eccLen));
  }
  const all: number[] = [];
  for (let i = 0; i < per; i++) blocks.forEach((b) => all.push(b[i]));
  for (let i = 0; i < eccLen; i++) eccs.forEach((b) => all.push(b[i]));

  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const fn = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setF = (x: number, y: number, dark: boolean) => {
    m[y][x] = dark ? 1 : 0;
    fn[y][x] = true;
  };
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setF(x, y, d !== 2 && d !== 4);
      }
  };
  for (let i = 0; i < size; i++) {
    setF(6, i, i % 2 === 0);
    setF(i, 6, i % 2 === 0);
  }
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const ap = ALIGN[ver];
  ap.forEach((cy, a) =>
    ap.forEach((cx, b) => {
      const last = ap.length - 1;
      if ((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) return;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) setF(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );
  for (let i = 0; i < 9; i++) {
    fn[8][i] = true;
    fn[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    fn[8][size - 1 - i] = true;
    fn[size - 1 - i][8] = true;
  }
  setF(8, size - 8, true);

  const dataBits: number[] = [];
  all.forEach((b) => {
    for (let k = 7; k >= 0; k--) dataBits.push((b >> k) & 1);
  });
  let idx = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let r = 0; r < size; r++) {
      const y = up ? size - 1 - r : r;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (!fn[y][x]) m[y][x] = dataBits[idx++] ?? 0;
      }
    }
    up = !up;
  }

  const withMask = (k: number) => {
    const g = m.map((row) => row.slice());
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[k](x, y)) g[y][x] ^= 1;
    let rem = k;
    for (let t = 0; t < 10; t++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((k << 10) | rem) ^ 0x5412;
    const bit = (n: number) => (f >>> n) & 1;
    for (let t = 0; t <= 5; t++) g[t][8] = bit(t);
    g[7][8] = bit(6);
    g[8][8] = bit(7);
    g[8][7] = bit(8);
    for (let t = 9; t < 15; t++) g[8][14 - t] = bit(t);
    for (let t = 0; t < 8; t++) g[8][size - 1 - t] = bit(t);
    for (let t = 8; t < 15; t++) g[size - 15 + t][8] = bit(t);
    g[size - 8][8] = 1;
    return g;
  };

  const penalty = (g: number[][]) => {
    let p = 0;
    const at = (pass: number, a: number, b: number) => (pass ? g[b][a] : g[a][b]);
    for (let pass = 0; pass < 2; pass++)
      for (let y = 0; y < size; y++) {
        let run = 1;
        for (let x = 1; x < size; x++) {
          if (at(pass, y, x) === at(pass, y, x - 1)) {
            run++;
            if (run === 5) p += 3;
            else if (run > 5) p++;
          } else run = 1;
        }
      }
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const s = g[y][x] + g[y][x + 1] + g[y + 1][x] + g[y + 1][x + 1];
        if (s === 0 || s === 4) p += 3;
      }
    const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const rev = [...pat].reverse();
    for (let pass = 0; pass < 2; pass++)
      for (let y = 0; y < size; y++)
        for (let x = 0; x <= size - 11; x++) {
          let f1 = true;
          let f2 = true;
          for (let k = 0; k < 11; k++) {
            const v = at(pass, y, x + k);
            if (v !== pat[k]) f1 = false;
            if (v !== rev[k]) f2 = false;
          }
          if (f1 || f2) p += 40;
        }
    let dark = 0;
    g.forEach((r) => r.forEach((v) => (dark += v)));
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  };

  let best = withMask(0);
  let bestPenalty = penalty(best);
  for (let k = 1; k < 8; k++) {
    const g = withMask(k);
    const p = penalty(g);
    if (p < bestPenalty) {
      bestPenalty = p;
      best = g;
    }
  }
  return best;
}
