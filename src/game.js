import StartScene from './scene_start.js'


// ゲームタイマー
class GameTimer{
    constructor() {
        this.startTime = (new Date()).getTime(); // ゲーム開始時刻
        this.frameCount = 0; // フレームインデックス
        this.frameRate = 60; // フレームレート
        this.forceEnd  = 30000; // 強制終了の時刻(ms)
        this.tmpTime = this.startTime;
    }

    require_end() {
        return this.tmpTime > this.forceEnd;
    }

    get_wait_time() {
        // 次フレーム計算開始の待ち時間 = 本来の１フレームの時間 - 今回のフレームの計算にかかった時間
        const passedTime = (new Date()).getTime()-this.startTime - this.tmpTime; // 今回のかかった時間
        const waitTime = 1000/this.frameRate - passedTime;
        const trueFrameCount = parseInt( this.tmpTime/(1000/this.frameRate) );
        // 何故か真のフレーム番号より早いときは少し(1フレーム分ぐらい)遅らせる
        if( trueFrameCount < this.frameCount ){
            return waitTime + 1000/this.frameRate;
        }else{
            return waitTime;
        }
    }

    flush() {
        this.tmpTime = (new Date()).getTime()-this.startTime;
        this.frameCount++;
    }
}


// シーンの切り替えなど
class SceneManager{

    constructor( realScreen, timer ) {
        this.state = null;
        this.scenes = {};
        this.timer = timer;
        this.realScreen = realScreen;

        this.changeScene(StartScene.sceneName, StartScene);
    }

    changeScene( sceneName, scene ) {
        if( this.state!==null ){ // 現在何らかのシーンを描画中であれば(ゲームが開始されているなら)シーンを終了
            if(this.realScreen.isDebugMode) 
                this.scenes[this.state].offScreen.closeDebugScreen();
            this.scenes[this.state].exit();
        }
        if( !(sceneName in this.scenes) ){ // 移行対象のシーンがまだ存在していないなら作成
            this.scenes[sceneName] = new scene(this.realScreen, this.timer, this);
        }
        this.state = sceneName; // 移行先のシーンを記憶
        if(this.realScreen.isDebugMode){
            const [H,W] = this.realScreen.getDebugScreenRealSize();
            this.scenes[this.state].offScreen.openDebugScreen(H,W);
        }
        this.scenes[this.state].enter(); // シーンに入る
    }

    run() {
        this.scenes[this.state].render();
        if(this.scenes[this.state].offScreen.debugCanvas!==null){
            this.scenes[this.state].debug_render();
        }
    }
}


export default class Game{
    constructor( realScreen ) {
        this.timer = new GameTimer();
        this.sceneMg = new SceneManager( realScreen, this.timer );

        this.nextFramePID = null;

        this.isDebugMode = false;
        this.debugCanvas = null;
        this.debugContext = null;
        window.addEventListener('keyup',(evt)=>{
            if(evt.key==='q') this.toggleDebugMode();
        },false);
    }

    toggleDebugMode() {
        this.isDebugMode = !this.isDebugMode;
        if(this.isDebugMode){
            this.debugCanvas = document.createElement('canvas');
            this.debugCanvas.width  = this.sceneMg.realScreen.canvas.width;
            this.debugCanvas.height = this.sceneMg.realScreen.canvas.height;
            this.debugContext = this.debugCanvas.getContext('2d');
            this.debugContext.fillStyle = "rgb(255,0,0";
            this.debugContext.fillRect(0,0,this.debugCanvas.width,this.debugCanvas.height);
            this.sceneMg.realScreen.setDebugMode(this.isDebugMode, this.debugCanvas);
        }else{
            this.debugCanvas = null;
            this.debugContext = null;
            this.sceneMg.realScreen.setDebugMode(this.isDebugMode, null);
        }
    }
    debug() {
        if(this.debugCanvas.width!==this.sceneMg.realScreen.canvas.width)
            this.debugCanvas.width = this.sceneMg.realScreen.canvas.width;
        if(this.debugCanvas.height!==this.sceneMg.realScreen.canvas.height)
            this.debugCanvas.height = this.sceneMg.realScreen.canvas.height;
        
        this.debugContext.fillStyle = "rgb(255,0,0";
        this.debugContext.fillRect(0,0,this.debugCanvas.width,this.debugCanvas.height);
    }

    start() {
        this.routine();
    }

    routine() {
        // 現在フレームの時刻を取得(ms)
        this.timer.flush();
        // シーンのレンダリング
        this.sceneMg.run();
        // 強制終了時刻を過ぎているとき、ゲームを終了する
        if( this.timer.require_end() ){ console.log('GAME END'); return; }
        // 次のフレームの処理を予約
        this.nextFramePID = window.setTimeout( ()=>this.routine(), this.timer.get_wait_time() );
        // ゲームのデバッグ情報表示
        if(this.isDebugMode) this.debug();
    }

    force_end() {
        window.clearTimeout(this.nextFramePID);
    }
}
