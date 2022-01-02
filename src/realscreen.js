

// リサイズされたとき
function windowResize( screenObj ){
    // 登録されている仮想画面がなければ返す
    if( screenObj.offScreen===null ) return;

    // 現在のブラウザサイズを計測、実画面をそれに一致させる
    const H = screenObj.canvas.height = document.body.clientHeight;
    const W = screenObj.canvas.width  = document.body.clientWidth;
    
    // 仮想画面にサイズ変更を知らせる
    if(screenObj.isDebugMode){
        screenObj.offScreen.catchWindowResizeEvent(parseInt(H/2),parseInt(W/2));
    }else{
        screenObj.offScreen.catchWindowResizeEvent(H,W);
    }
    
    // 実画面が仮想画面より縦長かどうかを見て描画範囲を決める
    const screenRatio = screenObj.offScreen.canvas.width / screenObj.offScreen.canvas.height;
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
    screenObj.renderOffScreen();
}


class RealScreen{

    constructor() { /* Singleton */ }

    initialize() { // Singleton Constructor
        this.isDebugMode = false;
        this.gameDebuggerCanvas = null;

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
    setDebugMode(bool, gameDebuggerCanvas) {
        if(bool===this.isDebugMode) return; // モードの変更がないならそのまま返す
        this.isDebugMode = bool;
        // デバッグモード有効化/無効化を仮想画面に知らせる
        if(this.isDebugMode){
            this.offScreen.openDebugScreen( this.canvas.height,
                                            parseInt(this.canvas.width/2) );
            this.gameDebuggerCanvas = gameDebuggerCanvas;
        }else{
            this.offScreen.closeDebugScreen();
            this.gameDebuggerCanvas = null;
        }
        windowResize(this);
    }

    getDebugScreenRealSize() {
        if(this.isDebugMode){
            return [this.canvas.height, parseInt(this.canvas.width/2)];
        }else{
            return [0,0];
        }
    }

    // 
    setOffScreen( offScreen ) {
        this.offScreen = offScreen;
        windowResize(this);
    }

    // 仮想画面を実画面に描画する関数
    renderOffScreen() {
        // 一度黒く塗りつぶしてから描画
        this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.context.drawImage( this.offScreen.canvas,
                        this.renderPosition.ltx, this.renderPosition.lty,
                        this.renderPosition.w,   this.renderPosition.h );
        if(this.isDebugMode){
            this.context.drawImage( this.offScreen.debugCanvas,
                this.renderPosition.ltxDs, this.renderPosition.ltyDs,
                this.renderPosition.wDs,   this.renderPosition.hDs );
            this.context.drawImage( this.gameDebuggerCanvas,
                this.renderPosition.ltxDg, this.renderPosition.ltyDg,
                this.renderPosition.wDg,   this.renderPosition.hDg );
        }
    }

}

export default new RealScreen();
