import Game from './game.js';
import RealScreen from './realscreen.js';


const main = ()=>{
    RealScreen.initialize(); // 画面の初期化
    const game = new Game( RealScreen ); // ゲームの作成
    game.start(); // ゲームの開始
};

// ページが読み込まれたら開始
window.addEventListener('load',main,false);
