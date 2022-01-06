'use strict';

import OffScreen from './offscreen.js';
import { Controller } from './controller.js';


export default class SceneBase {

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
        const [w,h] = this.sceneMg.defaultScreenResolution;
        this.offScreen = new OffScreen( h,w );
        this.controller = new Controller( this.timer );
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
        this.realScreen.renderOffScreen();
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
        this.debugScreen.context.fillStyle = "rgb(0,255,0)";
        this.debugScreen.context.fillRect(0,0,this.debugScreen.canvas.width,
                                              this.debugScreen.canvas.height);
    }
}

