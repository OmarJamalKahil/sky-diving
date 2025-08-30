export function parachutePosition(t: number, m: number, k: number, g: number = 9.81): number {
    return (m / k) * Math.log(Math.cosh(Math.sqrt((k * g) / m) * t));
}

export function calculateK(Cd: number, A: number, p: number = 1.225): number {
    return (1 / 2) * Cd * p * A ;
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
