'use strict';

// リサイズされたとき
function windowResize( screenObj ){
    // 登録されているシーンがなければ返す
    if( screenObj.scene===null ) return;

    // 現在のブラウザサイズを計測、実画面をそれに一致させる
    const rawH = document.body.clientHeight, rawW = document.body.clientWidth;
    let H,W;
    if(rawH*rawW>screenObj.pixellimit){
        const k = Math.sqrt(screenObj.pixellimit/(rawH*rawW));
        H = screenObj.canvas.height = parseInt(k*rawH);
        W = screenObj.canvas.width  = parseInt(k*rawW);
    }
    
    // 仮想画面にサイズ変更を知らせる
    screenObj.scene.offScreen.catchWindowResizeEvent( ...screenObj.getSizeForSceneScreen() );
    if(screenObj.isDebugMode){
        screenObj.scene.debugScreen.catchWindowResizeEvent( ...screenObj.getSizeForSceneDebugScreen() );
        screenObj.gameDebugScreen.catchWindowResizeEvent( ...screenObj.getSizeForGameDebugScreen() );
    }
    
    // 実画面が仮想画面より縦長かどうかを見て描画範囲を決める
    const screenRatio = screenObj.scene.offScreen.canvas.width / screenObj.scene.offScreen.canvas.height;
    screenObj.renderPosition.ltx = parseInt((W-Math.min(W,H*screenRatio))/2); // 貼り付け位置(左上)
    screenObj.renderPosition.lty = parseInt((H-Math.min(H,W/screenRatio))/2); // 貼り付け位置(左上)
    screenObj.renderPosition.w   = parseInt(   Math.min(W,H*screenRatio)   ); // 貼り付けるものサイズ
    screenObj.renderPosition.h   = parseInt(   Math.min(H,W/screenRatio)   ); // 貼り付けるものサイズ

    if(screenObj.isDebugMode){ // デバッグモードなら半分にする
        screenObj.renderPosition.ltx   = parseInt(screenObj.renderPosition.ltx/2);
        screenObj.renderPosition.lty   = parseInt(screenObj.renderPosition.lty/2);
        screenObj.renderPosition.w     = parseInt(screenObj.renderPosition.w/2);
        screenObj.renderPosition.h     = parseInt(screenObj.renderPosition.h/2);
        screenObj.renderPosition.ltxDs = parseInt(W/2);
        screenObj.renderPosition.ltyDs = 0;
        screenObj.renderPosition.wDs   = parseInt(W/2);
        screenObj.renderPosition.hDs   = H;
        screenObj.renderPosition.ltxDg = 0;
        screenObj.renderPosition.ltyDg = parseInt(H/2);
        screenObj.renderPosition.wDg   = parseInt(W/2);
        screenObj.renderPosition.hDg   = parseInt(H/2);
    }

    // 描画する
    screenObj.render();
}


class RealScreen{

    constructor() { /* Singleton */ }

    initialize( pixellimit ) { // Singleton Constructor
        this.isDebugMode = false;
        this.gameDebugScreen = null;
        this.pixellimit = pixellimit;

        // ページ全体の CSS 設定
        document.documentElement.style.margin = '0';
        document.documentElement.style.height = '100%';
        document.body.style.margin = '0';
        document.body.style.height = '100%';
        // キャンバスの作成とスタイル設定
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        this.canvas.style.height = '100%';
        this.canvas.style.width = '100%';
        // 実画面は RenderingContext2d で作る (WebGLな仮想画面を貼り付けするため)
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = "rgb(0,0,0)";

        // ブラウザウィンドウサイズが変更されたときのイベントを設定
        // 短い時間でリサイズイベントを受け取り過ぎたときは最新のものだけを実行する
        this.offScreen = null;
        this.scene = null;
        this.renderPosition = {'ltx'  : 0, 'lty'  : 0, 'w'  : 0, 'h'  : 0,
                               'ltxDs': 0, 'ltyDs': 0, 'wDs': 0, 'hDs': 0,
                               'ltxDg': 0, 'ltyDg': 0, 'wDg': 0, 'hDg': 0, };
        this.resizePID = null;
        window.addEventListener('resize',()=>{
            window.clearTimeout(this.resizePID);
            this.resizePID = window.setTimeout(windowResize, /*waiting time=*/ 30, this); // [SETTING]
        },false);

        // 現在のウィンドウサイズで初期化
        windowResize(this);
    }

    // デバッグモードの有効化/無効化
    setDebugMode(bool, gameDebugScreen ) {
        if(bool===this.isDebugMode) return; // モードの変更がないならそのまま返す
        this.isDebugMode = bool;
        // デバッグモード有効化/無効化を仮想画面に知らせる
        if(this.isDebugMode){
            this.scene.open_debugger( ...this.getSizeForSceneDebugScreen() );
            this.gameDebugScreen = gameDebugScreen;
        }else{
            this.scene.close_debugger();
            this.gameDebugScreen = null;
        }
        windowResize(this);
    }

    // 描画する場所の実際のサイズを求める
    getSizeForSceneDebugScreen() {
        return this.isDebugMode ? [this.canvas.height, this.canvas.width-parseInt(this.canvas.width/2)]
                                : [0,0];
    }
    getSizeForGameDebugScreen() {
        return this.isDebugMode ? [this.canvas.height, parseInt(this.canvas.width/2)]
                                : [0,0];
    }
    getSizeForSceneScreen() {
        return this.isDebugMode ? [parseInt(this.canvas.height/2), parseInt(this.canvas.width/2)]
                                : [this.canvas.height,this.canvas.width];
    }

    // シーンをセットする
    setScene( scene ) {
        this.scene = scene;
        windowResize(this);
    }

    // 仮想画面を実画面に描画する関数
    render() {
        // 一度画面全体を黒く塗りつぶしてからシーンの仮想画面を描画
        this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.context.drawImage( this.scene.offScreen.canvas,
                        this.renderPosition.ltx, this.renderPosition.lty,
                        this.renderPosition.w,   this.renderPosition.h );
        // デバッグモードならシーンのデバッグ画面とゲームのデバッグ画面も描画
        if(this.isDebugMode){
            this.context.drawImage( this.scene.debugScreen.canvas,
                this.renderPosition.ltxDs, this.renderPosition.ltyDs,
                this.renderPosition.wDs,   this.renderPosition.hDs );
            this.context.drawImage( this.gameDebugScreen.canvas,
                this.renderPosition.ltxDg, this.renderPosition.ltyDg,
                this.renderPosition.wDg,   this.renderPosition.hDg );
        }
    }
}

export default new RealScreen();
