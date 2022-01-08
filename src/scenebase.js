'use strict';

import OffScreen from './offscreen.js';


export default class SceneBase {

    // 適当な識別名を登録する必要あり
    // 各シーンごとに必ずオーバーライドする
    static sceneName = "scene base";

    // SceneBase を継承したクラスでのコンストラクタ
    // オーバーライドする必要はない
    constructor( realScreen, timer, sceneMg ){
        this.realScreen = realScreen;
        this.timer = timer;
        this.sceneMg = sceneMg;
        this.debugScreen = null;
        this.scene_initialize();
    }

    // シーンの初期化、シーンにあった仮想画面やコントローラーを作成するなど
    // 各シーンごとにオーバーライドする
    scene_initialize() {
        throw new Error('You have to implement this method "scene_initialize()" in child method.');
        /* like this ↓
        const [w,h] = this.sceneMg.defaultScreenResolution;
        this.offScreen = new OffScreen( h,w );
        this.controller = new Controller( this.timer );
        */
    }

    // シーン遷移でシーンに入るときの処理。必要に応じてオーバーライド
    enter() {
        this.realScreen.setScene( this );
        this.controller.activate();
    }
    // シーン遷移でシーンから出るときの処理。必要に応じてオーバーライド
    exit() {
        this.controller.deactivate();
    }

    // 各フレームのレンダリング処理が入ったときの処理。
    // 各シーンごとにオーバーライドする
    render() {
        throw new Error('You have to implement this method "render()" in child method.');
    }

    // デバッグ画面の初期化
    // デバッグする場合は各シーンごとにオーバーライドする
    open_debugger(H,W) {
        this.debugScreen = new OffScreen(H,W, '2d',false,false);
    }
    // デバッグ画面の消去、必要に応じてオーバーライド
    close_debugger() {
        this.debugScreen = null;
    }

    // デバッグ画面が表示されているときに実行される関数
    // デバッグする場合は各シーンごとにオーバーライドする
    debug_render() {
        this.debugScreen.context.fillStyle = "rgb(20,100,100)";
        this.debugScreen.context.fillRect(0,0,this.debugScreen.canvas.width,
                                              this.debugScreen.canvas.height);
        const S = this.debugScreen.canvas.height *0.03;
        this.debugScreen.context.fillStyle = "rgb(255,250,250)";
        this.debugScreen.context.font = String(S)+"px sans-serif";
        this.debugScreen.context.fillText( "scene debugger's render( ) is undefined", S, S*2.2);
    }
}

