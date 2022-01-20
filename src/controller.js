'use strict';

// キーボード
// マウス


class KyeBoard {

    constructor( timer ) {
        this.gameTimer = timer;
        this.ArrowUp    = [];
        this.ArrowDown  = [];
        this.ArrowLeft  = [];
        this.ArrowRight = [];
        this.Enter      = [];
        this[' ']       = [];

        // キーが押されたときの処理
        this.keyDownHandler = (evt)=>{
                if(evt.key in this){
                    console.log(evt.key, 'v');
                    const queue = this[evt.key];
                    // キューに中身が無い or キューの最後のやつが離し済み なら追加
                    if(queue.length===0 || 'end' in queue[queue.length-1]){
                        queue.push({ 'start': (new Date()).getTime()-this.gameTimer.startTime });
                    }
                }
            };
        // キーが離されたときの処理
        this.keyUpHandler = (evt)=>{
                if(evt.key in this){
                    console.log(evt.key, '^');
                    const queue = this[evt.key];
                    queue[queue.length-1]['end'] = (new Date()).getTime()-this.gameTimer.startTime;
                }
            };
    }

    activate() {
        console.log('keyboard activate');
        window.addEventListener('keydown',this.keyDownHandler,false);
        window.addEventListener('keyup',  this.keyUpHandler,  false);
    }

    deactivate() {
        window.removeEventListener('keydown',this.keyDownHandler,false);
        window.removeEventListener('keyup',  this.keyUpHandler,  false);
    }

}


class Controller {

    constructor( timer ) {
        console.log("controller initialized");
        this.KeyBoard = new KyeBoard( timer );
        this.Mouse = null;

    }

    activate() {
        this.KeyBoard.activate();
    }
    deactivate() {
        this.KeyBoard.deactivate();
    }

}

export { Controller };