'use strict';

import Game from './game.js';


const main = ()=>{
    const config = {'frameRate'        : "30",              // フレームレート
                    'forceEnd'         : 300000,           // ゲームを強制終了する時間(開始時刻からの経過ms)
                    'gameResolution'   : "HD (1280x720)",      // オフスクリーンセーフティゾーンの画面サイズ
                    'textureResolution': "2048",            // テクスチャのサイズ
                    'displayResolution': "Middle",         // 実際に映る画面の画素数上限
                    'debugBoot'        : false         };  // デバッグモードのまま起動するか否か
    const game = new Game( config ); // ゲームの作成
    game.start(); // ゲームの開始
};

// ページが読み込まれたら開始
window.addEventListener('load',main,false);
