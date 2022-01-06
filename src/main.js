'use strict';

import Game from './game.js';


const main = ()=>{
    const config = { 'fps'       : 30,              // フレームレート
                     'forceEnd'  : 30000,           // ゲームを強制終了する時間(開始時刻からの経過ms)
                     'resolution': [1280,720],      // オフスクリーンセーフティゾーンの画面サイズ
                     'textres'   : 1024,            // テクスチャのサイズ
                     'pixellimit': 1000000,         // 実際に映る画面の画素数上限
                     'debugBoot' : true         };  // デバッグモードのまま起動するか否か
    const game = new Game( config ); // ゲームの作成
    game.start(); // ゲームの開始
};

// ページが読み込まれたら開始
window.addEventListener('load',main,false);
 