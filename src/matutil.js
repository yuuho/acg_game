export default class MatUtil{
    /*
        クリッピング座標系が左手座標系なので最初から左手座標系で扱う。
        座標は列ベクトル。
    */


    // 行列の転置
    static T(mat) {
        const ret=[];
        for(let i=0;i<mat[0].length;i++){
            const row = [];
            for(let j=0;j<mat.length;j++) row.push(mat[j][i]);
            ret.push(row);
        }
        return ret;
    }

    // 行列同士の掛け算 matrix multiply
    static mm(mat1,mat2) { // mat1(N,M) mat2(M,K) -> (N,K)
        const ret=[];
        for(let i=0;i<mat1[0].length;i++){
            const row = [];
            for(let j=0;j<mat2[0].length;j++){
                let v = 0; for(let k=0;k<mat1[0].length;k++) v += mat1[i][k]*mat2[k][j];
                row.push(v);
            }
            ret.push(row);
        }
        return ret;
    }

    // 視錐台変換
    static proj(deg,asp,near,far) {
        // deg : x
        // asp : W/H = X/Y
        // 0<near<far, カメラが原点から z軸方向を見るように。左手座標系
        const rad = (deg/2.0) * (Math.PI/180);   // angle of view
        const mat = [[1/Math.tan(rad), 0,                 0,                     0                        ],
                     [0,               asp/Math.tan(rad), 0,                     0                        ],
                     [0,               0,                 (far+near)/(far-near), -(2*far*near)/(far-near) ],
                     [0,               0,                 1,                     0                        ]];
        // near -> z=-1, far -> z=+1
        return mat
    }

    // Y軸回りに回転： 座標平面↑Z→X 半時計回り
    static rotY(deg) {
        const rad = ((deg/360)%1)*(2*Math.PI);
        const sin = Math.sin(rad);
        const cos = Math.cos(rad);
        const mat = [[cos, 0,-sin,  0],
                     [0,   1, 0,    0],
                     [sin, 0, cos,  0],
                     [0,   0, 0,    1] ];
        return mat;
    }

    // 平行移動
    static move(x,y,z) {
        return [[1, 0, 0, x],
                [0, 1, 0, y],
                [0, 0, 1, z],
                [0, 0, 0, 1] ];
    }

    static scale(x,y,z) {
        return [[x, 0, 0, 0],
                [0, y, 0, 0],
                [0, 0, z, 0],
                [0, 0, 0, 1] ];
    }

    // カメラの平行移動
    static camMove(x,y,z) {
        return MatUtil.move(-x,-y,-z);
    }

    // left-handed system = X軸回転 ↑Y→Z
    static camLookUpL(deg) {
        const rad = ((deg/360)%1)*(2*Math.PI);
        const sin = Math.sin(rad);
        const cos = Math.cos(rad);
        const mat = [[1,   0,    0, 0],
                     [0, cos, -sin, 0],
                     [0, sin,  cos, 0],
                     [0,   0,    0, 1] ];
        return mat;
    }


    static homo(mat) {

    }

    // デバッグ表示用：同次座標をXYZ座標に変換
    static ihomo(mat) {
        const ret=[];
        for(let i=0;i<mat.length;i++){
            const row = [];
            for(let j=0;j<mat[0].length-1;j++) row.push(mat[i][j]/mat[i][mat[i].length-1]);
            ret.push(row);
        }
        return ret;
    }

    // デバッグ用表示：行列の表示
    static print(mat){
        let ret = "";
        for(let i=0;i<mat.length;i++){
            ret += i===0 ? "[[" : " [";
            for(let j=0;j<mat[0].length;j++)
                ret += ("    "+(mat[i][j]).toFixed(3)).slice(-8)+(j===mat[0].length-1 ? "" : ",") ;
            ret += i===mat.length-1 ? "]]" : "],\n";
        }
        return ret;
    }

    static vec1d_to_colvec(vec1d){
        let ret = [];
        for(let i=0;i<vec1d.length;i++){
            ret.push([vec1d[i]]);
        }
        return ret;
    }
}
