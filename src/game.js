'use strict';

import RealScreen from './realscreen.js';
import OffScreen from './offscreen.js';
import StartScene from './scene_start.js'


// ゲームの設定を一元管理する (configシーン以外からは read only として使うべし)
class GameConfig{
    constructor(config_dict=null) {
        this.displayResolutionChoices = {
            "Low"    : 500000,  // QHD未満
            "Middle" : 1000000, // 1280*720
            "High"   : 3000000, // FHD
            "Super"  : 8300000, // 4K
        };
        this.gameResolutionChoices = {
            "Eco mode (640x360)" : [640,360],
            "QHD (960x540)"      : [960,540],
            "HD (1280x720)"      : [1280,720],
            "FHD (1920x1080)"    : [1920,1080],
            "WQHD (2560x1440)"   : [2560,1440],
            "4K (3840x2160)"     : [3840,2160],
        };
        this.textureResolutionChoices = {
            "512" : 512,
            "1024": 1024,
            "2048": 2048,
        };
        this.frameRateChoices = {
            "30" : 30,
            "60" : 60,
            "90" : 90,
        };
        this.set_from_dict( this.default_setting() );
        if(config_dict!==null) this.set_from_dict(config_dict);
    }

    default_setting() {
        return {
            'displayResolution': "High",
            'gameResolution'   : "FHD (1920x1080)",
            'textureResolution': "2048",
            'frameRate'        : "60",
            'forceEnd'         : 600000,
            'debugBoot'        : false,
        };
    }

    set_from_dict(dict) {
        this.displayResolution = this.displayResolutionChoices[ dict["displayResolution"] ];
        this.gameResolution    = this.gameResolutionChoices[    dict["gameResolution"]    ];
        this.textureResolution = this.textureResolutionChoices[ dict["textureResolution"] ];
        this.frameRate         = this.frameRateChoices[         dict["frameRate"]         ];
        this.forceEnd          = dict["forceEnd"];
        this.debugBoot         = dict["debugBoot"];
    }

    set_param(attr,choice) {
        this[attr] = this[attr+"Choices"][choice];
    }
}

// ゲームタイマー
class GameTimer{

    constructor( gameConfigObj ) {
        this.gameConfigObj = gameConfigObj;
        this.startTime = (new Date()).getTime(); // ゲーム開始時刻
        this.frameCount = 0; // フレームインデックス
        this.frameRate = this.gameConfigObj.frameRate; // フレームレート
        this.forceEnd  = this.gameConfigObj.forceEnd; // 強制終了の時刻(ms)
        this.tmpTime = this.startTime;
    }

    require_end() {
        return this.tmpTime > this.forceEnd;
    }

    change_frame_rate( newFrameRate ) {
        // 現在のフレームレート
        const tmpFrameRate = this.frameRate;
        // 今のフレームカウントを換算
        this.frameCount = parseInt(this.frameCount/tmpFrameRate*newFrameRate);
        // フレームレートを更新
        this.frameRate = newFrameRate;
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
        // フレームレートの設定が変わっていたら設定をし直す
        if(this.gameConfigObj.frameRate!==this.frameRate)
            this.change_frame_rate(this.gameConfigObj.frameRate);
        // ゲームを開始してから現在までの経過時間を取得する
        this.tmpTime = (new Date()).getTime()-this.startTime;
        // これまでにレンダリングした回数を記憶 (早過ぎ・遅過ぎの場合に補正するため利用)
        this.frameCount++;
    }
}


// シーンの切り替えなど
class SceneManager{

    constructor( realScreen, timer, gameConfigObj ) {
        this.config = gameConfigObj;
        this.state = null;
        this.scenes = {};
        this.timer = timer;
        this.realScreen = realScreen;

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
        // ゲームの設定をする
        this.config = new GameConfig(config);
        // 実際に映るHTML要素 = RealScreen を初期化
        RealScreen.initialize( this.config );
        // タイマーとシーン管理のオブジェクトを作成
        this.timer = new GameTimer( this.config );
        this.sceneMg = new SceneManager( RealScreen, this.timer, this.config );
        // 次のフレームをレンダリングするプロセスのIDを記憶しておく
        this.nextFramePID = null;

        // デバッグ関係の初期化、デバッガの起動イベント
        this.isDebugMode = false;
        this.debugScreen = null;
        window.addEventListener('keyup',(evt)=>{ if(evt.key==='q') this.toggleDebugMode(); },false);
        // 最初からデバッグモードで起動するなら
        if(this.config.debugBoot) this.toggleDebugMode();
    }

    // デバッグモード <-> 非デバッグモード を切り替える関数
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

    // メインループ
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
