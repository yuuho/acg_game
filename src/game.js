'use strict';

import RealScreen from './realscreen.js';
import OffScreen from './offscreen.js';
import StartScene from './scene_start.js'


// ゲームタイマー
class GameTimer{

    constructor( frameRate, forceEnd ) {
        this.startTime = (new Date()).getTime(); // ゲーム開始時刻
        this.frameCount = 0; // フレームインデックス
        this.frameRate = frameRate; // フレームレート
        this.forceEnd  = forceEnd; // 強制終了の時刻(ms)
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
            console.log('bug');
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

    constructor( realScreen, timer, defaultScreenResolution, defaultTextResolution ) {
        this.state = null;
        this.scenes = {};
        this.timer = timer;
        this.realScreen = realScreen;
        this.defaultScreenResolution = defaultScreenResolution;
        this.defaultTextResolution = defaultTextResolution;

        this.changeScene(StartScene.sceneName, StartScene);
    }

    changeScene( sceneName, scene ) {
        if( this.state!==null ){ // 現在何らかのシーンを描画中であれば(ゲームが開始されているなら)シーンを終了
            if(this.realScreen.isDebugMode) this.scenes[this.state].close_debugger();
            this.scenes[this.state].exit();
        }
        if( !(sceneName in this.scenes) ){ // 移行対象のシーンがまだ存在していないなら作成
            this.scenes[sceneName] = new scene(this.realScreen, this.timer, this);
        }
        this.state = sceneName; // 移行先のシーンを記憶
        if(this.realScreen.isDebugMode){
            const [H,W] = this.realScreen.getSizeForSceneDebugScreen();
            this.scenes[this.state].open_debugger(H,W);
        }
        this.scenes[this.state].enter(); // シーンに入る
    }

    run() {
        this.scenes[this.state].render();
        if(this.scenes[this.state].debugScreen!==null) this.scenes[this.state].debug_render();
    }
}


export default class Game{

    constructor( config ) {

        const conf = config!==null ? config : {
                            'fps'       : 60,
                            'forceEnd'  : 30000,
                            'resolution': [1920,1080],
                            'textres'   : 2048,
                            'pixellimit': 3000000,
                            'debugBoot' : false         };
        // 実際に映るHTML要素 = RealScreen を初期化
        RealScreen.initialize( conf.pixellimit );

        this.timer = new GameTimer( conf.fps, conf.forceEnd );
        this.sceneMg = new SceneManager( RealScreen, this.timer, conf.resolution, conf.textres );
        this.nextFramePID = null;

        // デバッグ関係の初期化、デバッガの起動イベント
        this.isDebugMode = false;
        this.debugScreen = null;
        window.addEventListener('keyup',(evt)=>{ if(evt.key==='q') this.toggleDebugMode(); },false);

        // 最初からデバッグモードで起動するなら
        if(conf.debugBoot) this.toggleDebugMode();
    }

    toggleDebugMode() {
        this.isDebugMode = !this.isDebugMode;
        if(this.isDebugMode){
            this.debugScreen = new OffScreen(1,1, '2d', false,true);
            this.debugInfo = { 'data': [], 'limit': Math.ceil(1000/this.timer.frameRate) };
            this.sceneMg.realScreen.setDebugMode(this.isDebugMode, this.debugScreen);
        }else{
            this.debugScreen = null;
            this.debugInfo = null;
            this.sceneMg.realScreen.setDebugMode(this.isDebugMode, null);
        }
    }
    debug_render() {
        // 幅高さがあるべきサイズでなかったら合わせる
        const [H,W] = this.sceneMg.realScreen.getSizeForGameDebugScreen();
        if(this.debugScreen.canvas.width !==W) this.debugScreen.canvas.width  = W;
        if(this.debugScreen.canvas.height!==H) this.debugScreen.canvas.height = H;
        // 背景
        this.debugScreen.context.fillStyle = "rgb(255,0,0)";
        this.debugScreen.context.fillRect(0,0,this.debugScreen.canvas.width,this.debugScreen.canvas.height);
        this.debugScreen.context.fillStyle = "rgb(100,0,0)";
        const m = 4;
        this.debugScreen.context.fillRect(m,m,this.debugScreen.canvas.width-m*2,this.debugScreen.canvas.height-m*2);

        // フォントサイズ
        const S = Math.ceil(H*0.03);

        // フレーム番号
        this.debugScreen.context.fillStyle = "rgb(250,255,250)";
        this.debugScreen.context.font = String(S)+"px 'Roboto Condensed'";
        this.debugScreen.context.fillText( "frame : "+this.timer.frameCount+" / "
                                            +parseInt(this.timer.forceEnd/1000*this.timer.frameRate),
                                            S, S*2.2);

        // シーン名
        this.debugScreen.context.fillText( "scene : "+String(this.sceneMg.state), S, S*4);

        // 経過時間を取得
        this.debugInfo.data.push({
                'idx'   : this.timer.frameCount,
                'start' : this.timer.tmpTime,
                'end'   : ((new Date()).getTime()-this.timer.startTime),
                'used'  : (((new Date()).getTime()-this.timer.startTime)-this.timer.tmpTime)
            });

        // 描画する個数
        const maxnum = 15;
        const numdel = this.debugInfo.data.length - maxnum;
        for(let i=0;i<numdel;i++) this.debugInfo.data.shift();
        // 描画
        const sty = S*6, stx = S*3, mg = 0.15;
        for(let i=0;i<this.debugInfo.data.length;i++){
            const D = this.debugInfo.data[i];
            this.debugScreen.context.fillText(
                D.idx+" : "+D.start+" -> "+D.end+" : "+D.used,
                stx, sty+S*(i+(i-1)*mg)
            );
        }
    }

    start() {
        this.routine();
    }

    routine() {
        // ルーチンの最初に計算済み画面を反映する
        this.sceneMg.realScreen.render();

        // 現在フレームの時刻を取得(ms)
        this.timer.flush();
        // シーンのレンダリング
        this.sceneMg.run();
        // ゲームのデバッグ情報表示
        if(this.isDebugMode) this.debug_render();
        // 強制終了時刻を過ぎているとき、ゲームを終了する
        if( this.timer.require_end() ){ console.log('GAME END'); return; }
        // 次のフレームの処理を予約
        this.nextFramePID = window.setTimeout( ()=>this.routine(), this.timer.get_wait_time() );
    }

    force_end() {
        window.clearTimeout(this.nextFramePID);
    }
}
