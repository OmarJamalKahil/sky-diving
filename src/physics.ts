export function parachutePosition(t: number, m: number, k: number, g: number = 9.81): number {
    return (m / k) * Math.log(Math.cosh(Math.sqrt((k * g) / m) * t));
}


// احسب التسارع
export function calculateAccelrate(m: number, k: number, v: number, g: number = 9.81): number {
    return g - (k/m) * v*v;
}

// احسب المقاومةالكلية
export function calculateTotalForce(Fg: number, Fr: number): number {
    return Fg - Fr ;
}

// احسب الجاذبية
export function calculateGravityForce(m: number, g: number = 9.81): number {
    return m * g ;
}

// احسب مقاومة الرياح
export function calculateAirForce(k: number, v: number): number {
    return k * v*v;
}

// احسب السرعة
export function calculateVelocity(t: number, m: number, k: number, g: number = 9.81): number {
  return (Math.sqrt((m * g)/ k)) * Math.tanh(Math.sqrt((k * g) / m) * t);  
}









export function calculateK(Cd: number, A: number, p: number = 1.225): number {
    return (1 / 2) * Cd * p * A ;
}

export function forcesAndAcceleration3DWithWind(
  m: number,
  k: number,
  vx: number,
  vy: number,
  vz: number,
  windVx: number,
  windVy: number,
  windVz: number,
  g: number = 9.81
) {
  // السرعة النسبية للجسم بالنسبة للهواء
  const vrelX = vx - windVx;
  const vrelY = vy - windVy;
  const vrelZ = vz - windVz;

  const vrel = Math.hypot(vrelX, vrelY, vrelZ) || 0;

  // قوة الجاذبية
  const Fg = { Fx: 0, Fy: -m * g, Fz: 0 };

  // قوة مقاومة الهواء بناءً على السرعة النسبية
  const Fd = {
    Fx: -k * vrel * vrelX,
    Fy: -k * vrel * vrelY,
    Fz: -k * vrel * vrelZ,
  };

  // القوة الكلية
  const Fx = Fg.Fx + Fd.Fx;
  const Fy = Fg.Fy + Fd.Fy;
  const Fz = Fg.Fz + Fd.Fz;

  // التسارع
  const ax = Fx / m;
  const ay = Fy / m;
  const az = Fz / m;

  return { Fx, Fy, Fz, ax, ay, az };
}


export function stepSemiImplicit(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  m: number,
  k: number,
  dt: number,
  windVx: number = 0,
  windVy: number = 0,
  windVz: number = 0,
  g: number = 9.81
) {
    
  const { ax, ay, az } = forcesAndAcceleration3DWithWind(
    m, k, vx, vy, vz, windVx, windVy, windVz, g
  );

  // تحديث السرعات أولاً
  const vx2 = vx + ax * dt;
  const vy2 = vy + ay * dt;
  const vz2 = vz + az * dt;

  // ثم تحديث المواقع باستخدام السرعات الجديدة
  const x2 = x + vx2 * dt;
  const y2 = y + vy2 * dt;
  const z2 = z + vz2 * dt;

  return { x: x2, y: y2, z: z2, vx: vx2, vy: vy2, vz: vz2, ax: ax, ay: ay, az: az };
}
