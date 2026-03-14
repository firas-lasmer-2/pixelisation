const { performance } = require('perf_hooks');

function testSpeed() {
  const w = 1000;
  const h = 1200;
  const len = w * h * 4;
  const data = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 255;
  }

  const palette = Array.from({ length: 15 }, () => ({
    r: Math.random() * 255,
    g: Math.random() * 255,
    b: Math.random() * 255
  }));

  const start = performance.now();
  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];

    let minDist = Infinity;
    let minIdx = 0;
    for (let p = 0; p < palette.length; p++) {
      const c = palette[p];
      const dist = (r - c.r)**2 + (g - c.g)**2 + (b - c.b)**2;
      if (dist < minDist) {
        minDist = dist;
        minIdx = p;
      }
    }
    const best = palette[minIdx];
    data[i] = best.r;
    data[i+1] = best.g;
    data[i+2] = best.b;
  }
  const end = performance.now();
  
  console.log(`Time taken for ${w}x${h} pixels with ${palette.length} colors: ${end - start}ms`);
}

testSpeed();
