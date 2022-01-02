

class OffScreenBase{
    constructor( realScreen ) {
        this.realScreen = realScreen;
        this.debugCanvas = null;
        this.debugContext = null;
        // キャンバス作成と WebGL コンテキストの受け取り
        this.canvas = document.createElement('canvas');
        this.canvas.height = 720;
        this.canvas.width = 1280;
        this.context = this.gl = this.canvas.getContext('webgl2');
        
        // WebGL のデフォルト設定を決めておく
        this.gl.clearColor(1.0, 1.0, 1.0, 1.0); // 背景色 = 白
        this.gl.clearDepth(1.0); // デプスバッファ最奥
        // this.gl.enable(this.gl.CULL_FACE); // 反時計回りの三角形しか描画しない設定
        // this.gl.frontFace(this.gl.CW); // 時計回りの三角形を表に変更する
        this.gl.enable(this.gl.DEPTH_TEST); // 深度テストを有効化する
        this.gl.enable(this.gl.BLEND); // WebGL の透過機能を有効化する
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA); // 透過の設定 = 通常のアルファブレンド
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT); // 色と深度を初期化
    }

    // 実画面のサイズが変更されたときに実行される。必要に応じてオーバーライド
    catchWindowResizeEvent(H,W) {
        if(this.debugCanvas!==null){
            this.debugCanvas.height = H;
            this.debugCanvas.width = parseInt(W/2);
        }
    }

    // デバッグ画面を開く
    openDebugScreen(H,W) {
        this.debugCanvas = document.createElement('canvas');
        this.debugCanvas.height = H;
        this.debugCanvas.width  = W;
        this.debugContext = this.debugCanvas.getContext('2d');
        this.debugContext.fillStyle = "rgb(0,255,0)";
        this.debugContext.fillRect(0,0,this.debugCanvas.width,this.debugCanvas.height);
    }
    // デバッグ画面を閉じる
    closeDebugScreen() {
        this.debugCanvas = null;
        this.debugContext = null;
    }
}


// フルHD の仮装画面を作る
class OffScreenHD extends OffScreenBase{
    constructor( realScreen ) {
        super( realScreen );
        // フルHD (=1920x1080) の画面に設定して viewport 設定を更新
        this.canvas.height = 1080;
        this.canvas.width = 1920;
        this.context.viewport(0,0,1920,1080);
    }
}


// フルスクリーンの仮想画面
class OffScreenFull extends OffScreenBase{
    constructor( realScreen ) {
        super( realScreen );
        // 実画面と同じ
        this.canvas.height = realScreen.canvas.height;
        this.canvas.width = realScreen.canvas.width;
        this.context.viewport(0,0, realScreen.canvas.width,
                                   realScreen.canvas.height);
    }

    catchWindowResizeEvent(H,W) {
        this.canvas.height = H;
        this.canvas.width = W;
        this.context.viewport(0,0, W,H);

        if(this.debugCanvas!==null){
            this.debugCanvas.height = H;
            this.debugCanvas.width = parseInt(W/2);
        }
    }
}


export { OffScreenFull, OffScreenHD };