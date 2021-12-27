import StartScene from './scene_start.js'


// ゲームタイマー
class GameTimer{
    constructor() {
        this.startTime = (new Date()).getTime(); // ゲーム開始時刻
        this.frameCount = 0; // フレームインデックス
        this.frameRate = 60; // フレームレート
        this.forceEnd  = 10000; // 強制終了の時刻(ms)
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

    constructor( realScreen, controller ) {
        this.state = null;
        this.scenes = {};

        this.realScreen = realScreen;
        this.controller = controller;

        this.changeScene('default', StartScene);
    }

    changeScene( sceneName, scene ) {
        if( this.state!==null ){
            this.scenes[this.state].exit();
        }
        if( !(sceneName in this.scenes) ){
            this.scenes[sceneName] = new scene(this.realScreen, this.controller, this);
        }
        this.state = sceneName;
        this.scenes[this.state].enter();
    }

    run( timer ) {
        return this.scenes[this.state].render( timer );
    }
}


export default class Game{
    constructor( realScreen, controller ) {
        this.timer = new GameTimer();
        controller.initialize( this.timer );
        this.sceneMg = new SceneManager( realScreen, controller );
    }

    start() {
        this.routine();
    }

    routine() {
        // 現在フレームの時刻を取得(ms)
        this.timer.flush();
        // シーンのレンダリング
        this.sceneMg.run( this.timer );
        // 強制終了時刻を過ぎているとき、ゲームを終了する
        if( this.timer.require_end() ){ console.log('GAME END'); return; }
        // 次のフレームの処理を予約
        window.setTimeout( ()=>this.routine(), this.timer.get_wait_time() );
    }
}
