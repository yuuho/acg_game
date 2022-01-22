'use strict';

export default class QuaternionUtil {

    static gen(rotAxis, deg) {
        // 左手座標系で右ねじの法則
        const rad = ((deg/360))*(2*Math.PI);
        const [sin,cos] = [ Math.sin(rad/2), Math.cos(rad/2) ];
        const q = [ rotAxis[0]*sin, rotAxis[1]*sin, rotAxis[2]*sin, cos ];
        return QuaternionUtil.normalize(q);
    }
    
    // 正規化 (クォータニオンはノルム1のベクトルでないといけない)
    static normalize(q) {
        const length = Math.sqrt( q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3] );
        const len = Math.max(length, 0.0000001);
        return q.map(e=>e/len);
    }

    // 掛け算、クォータニオンの回転を合成するのにも使える。Aが先に適用される回転。
    static mul(A,B) {
        return QuaternionUtil.normalize([
            + B[3] * A[0] - B[2] * A[1] + B[1] * A[2] + B[0] * A[3],
            + B[2] * A[0] + B[3] * A[1] - B[0] * A[2] + B[1] * A[3],
            - B[1] * A[0] + B[0] * A[1] + B[3] * A[2] + B[2] * A[3],
            - B[0] * A[0] - B[1] * A[1] - B[2] * A[2] + B[3] * A[3]
        ]);
    }

    static add(A,B) {
        return QuaternionUtil.normalize([ A[0]+B[0], A[1]+B[1], A[2]+B[2], A[3]+B[3] ]);
    }
    static dot(A,B) {
        return A[0]*B[0]+A[1]*B[1]+A[2]*B[2]+A[3]*B[3];
    }

    // 球面線形補間
    static slerp(A, B, t) {
        const r = Math.acos( QuaternionUtil.dot(A,B) );
        const k1 = Math.sin( (1.0-t)*r ) / Math.sin(r);
        const k2 = Math.sin( t*r       ) / Math.sin(r);
        return QuaternionUtil.add( A.map(e=>e*k1), B.map(e=>e*k2) );
    }
}