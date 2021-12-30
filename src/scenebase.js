import { OffScreenHD } from './offscreen.js';
import { Controller } from './controller.js';


export default class SceneBase {

    // SceneBase を継承したクラスでのコンストラクタ
    // オーバーライドする必要はない
    constructor( realScreen, timer, sceneMg ){
        this.realScreen = realScreen;
        this.timer = timer;
        this.sceneMg = sceneMg;
        this.scene_initialize();
    }

    // シーンの初期化、シーンにあった仮想画面やコントローラーを作成するなど
    // 各シーンごとにオーバーライドする
    scene_initialize() {
        this.offScreen = new OffScreenHD( this.realScreen );
        this.controller = new Controller( this.timer );
    }

    // シーン遷移でシーンに入るときの処理。必要に応じてオーバーライド
    enter() {
        this.realScreen.setOffScreen( this.offScreen );
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
}

