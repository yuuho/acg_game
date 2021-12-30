import Game from './game.js';
import RealScreen from './realscreen.js';
import Controller from './controller.js';


const main = ()=>{

    // UI要素
    RealScreen.initialize();

    //const controller = new Controller();

    const game = new Game( RealScreen );
    game.start();
};


// 開始
window.addEventListener('load',main,false);
