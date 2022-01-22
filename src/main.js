'use strict';

import Game from './game.js';


const main = ()=>{
    const config = {'frameRate'        : "30",              // フレームレート
                    'forceEnd'         : 300000,           // ゲームを強制終了する時間(開始時刻からの経過ms)
                    'gameResolution'   : "HD (1280x720)",      // オフスクリーンセーフティゾーンの画面サイズ
                    'textureResolution': "2048",            // テクスチャのサイズ
                    'displayResolution': "Middle",         // 実際に映る画面の画素数上限
                    'debugBoot'        : true         };  // デバッグモードのまま起動するか否か
    const game = new Game( config ); // ゲームの作成
    game.start(); // ゲームの開始
};

// ページが読み込まれたら開始
window.addEventListener('load',main,false);


window.addEventListener('load',()=>{
    console.log(7 in [1,7,3].values());
},false);

// window.addEventListener('load',()=>{
// 
//     const N = 999999;
//     let start = 0;
// 
//     const jsarr = [...Array(N)].map((_,i)=>i);
//     const f32arr = new Float32Array( [...Array(N)].map((_,i)=>i) );
//     console.log(f32arr);
// 
//     start = (new Date()).getTime();
//     const f32arr2 = new Float32Array( f32arr );
//     console.log((new Date()).getTime()-start, f32arr2);
// 
//     start = (new Date()).getTime();
//     const f32arr3 = new Float32Array( jsarr );
//     console.log((new Date()).getTime()-start, f32arr3);
// 
//     console.log(f32arr instanceof Float32Array);
//     console.log(f32arr instanceof Float64Array);
// 
// },false);
