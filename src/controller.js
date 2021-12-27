

// キーボード
// マウス


class KyeBoard {

    constructor() {
        this.ArrowUp    = [];
        this.ArrowDown  = [];
        this.ArrowLeft  = [];
        this.ArrowRight = [];
        this.Enter      = [];
    }

    initialize( timer ) {
        this.gameTimer = timer;

        // キーが押されたときの処理
        window.addEventListener('keydown',(evt)=>{
            if(evt.key in this){
                console.log(evt.key, 'v');
                const queue = this[evt.key];
                // キューに中身が無い or キューの最後のやつが離し済み なら追加
                if(queue.length===0 || 'end' in queue[queue.length-1]){
                    queue.push({ 'start': (new Date()).getTime()-this.gameTimer.startTime });
                }
            }
        },false);
        // キーが離されたときの処理
        window.addEventListener('keyup',(evt)=>{
            if(evt.key in this){
                console.log(evt.key, '^');
                const queue = this[evt.key];
                queue[queue.length-1]['end'] = (new Date()).getTime()-this.gameTimer.startTime;
            }
        },false);
    }

}


export default class Controller {

    constructor() {
        console.log("controller initialized");
        this.KeyBoard = new KyeBoard();
        

    }

    initialize( timer ) {
        this.KeyBoard.initialize( timer );
    }

}