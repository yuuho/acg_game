'use strict';


export default class GLSLUtil{
    static shader = `
        // 入力 (すべて世界座標系)
        //  p : 世界座標
        //  n : 法線ベクトル
        //  v : カメラ方向
        
        // 拡散反射 diffusion : どこからみても一緒の強さな反射
        // 鏡面反射 specular  : 見る方向によって光の強度が変わる反射
        
        // 環境光
        // 何も考慮しない。全体を一様に持ち上げる。法線が単位ベクトルでない場合は強くなるっぽい
        vec3 ambientShadeD( vec3 p, vec3 n ){
            const vec3 ambientColor = vec3(1.0, 1.0, 0.0);
            vec3 l = n;
            vec3 clight = vec3(0.1);
            return max( 0.0, dot(l,n) )*clight*ambientColor;
        }
        
        // 無限遠光源 拡散反射
        // 向きだけ考慮(入射角によって強度が決まる)、光源からの距離は無視、見る方向は無視
        vec3 directionalShadeD( vec3 p, vec3 n ){
            const vec3 directionalColor = vec3(0.5, 0.8, 0.8);
            const vec3 l = normalize( vec3(1.0, 0.0, 1.0) ); // ライトがある方角
            vec3 clight = vec3(1.0);
            return max(0.0, dot(l,n)) * clight * directionalColor;
        }
        
        // 点光源 拡散反射
        // 向きを考慮(入射角によって強度が決まる)、光源からの距離によって光の強さが減衰、見る方向は無視
        vec3 pointShadeD( vec3 p, vec3 n ){
            const vec3 pointLight = vec3(3.0, 3.0, -3.0);
            const vec3 pointColor = vec3(0.3, 0.5, 0.8);
            
            vec3 d = pointLight-p;    // 点から光源までのベクトル
            float r = sqrt(dot(d,d)); // 点から光源までの距離
            vec3 l = d / r;           // 点から光源への方向ベクトル
            vec3 clight = vec3(1.0) * pow( 1.5 / max(r, 1.0), 2.0 ); // 強度
            return max(0.0, dot(l,n)) * clight * pointColor;
        }`;
}