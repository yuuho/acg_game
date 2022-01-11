'use strict';

// セーフティゾーンの解像度を保護する？
// offscreen : { clip, nonclip }
// context : { webgl2, context2d }
// aspect : { type-A=([-1.0,+1.0],[-1.7,+1.7]), type-B=([-1.0,+1.0],[-1.0,+1.0]) }

// { GL, 2D }-{ UpperLimited, PixelPerfect }-{ Nonclip, Clipped }

// |                   | Clipped                  | Nonclip                      |
// +-------------------+--------------------------+------------------------------+
// | visibleArea range | [-1.0,+1.0],[-1.7,+1.7]  | [-1.0,+1.0],[-1.7,+1.7]      |
// | safetyZone range  | same -^                  | [-3.0,+3.0],[-1.7,+1.7] etc. |


export default class OffScreen{
    
    constructor(safetyZoneHeight,safetyZoneWidth, contextType='webgl2', clip=true, pixelPerfect=false) {
        this.originSize = [safetyZoneHeight,safetyZoneWidth];
        this.originRatio = safetyZoneWidth / safetyZoneHeight;
        this.clip = clip;
        this.pixelperfect = pixelPerfect;

        // キャンバス作成
        this.canvas = document.createElement('canvas');
        this.canvas.height = safetyZoneHeight;
        this.canvas.width  = safetyZoneWidth;
        
        // コンテキスト作成・初期化
        console.assert(contextType==='webgl2' || contextType==='2d');
        this.contextType = contextType;
        this.initialize();
    }

    // コンテキストの作成・初期化
    initialize() {
        if(this.contextType==='webgl2'){
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
            this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
        }else{
            this.context = this.canvas.getContext('2d');
            this.context.fillStyle = "rgb(0,255,0)";
            this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
    }

    clear() {
        if(this.contextType==='webgl2'){
            this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT); // 色と深度を初期化
        }else{
            this.context.fillStyle = "rgb(0,255,0)";
            this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
    }

    // 描画範囲の xy座標限界、セーフティゾーンの xy座標限界 を返す
    getXYlims() {
        // return [Xlim,Ylim, sXlim,sYlim];
        // clip しているなら映る画面はセーフティゾーンと同じ
        if(this.clip){
                if(this.originRatio>=1.0){ // セーフティゾーンが横長画面なら
                    return [ this.originRatio, 1.0, this.originRatio, 1.0];
                }else{ // セーフティゾーンが縦長画面なら
                    return [ 1.0, 1.0/this.originRatio, 1.0, 1.0/this.originRatio];
                }
        }else{
            const screenRatio = this.canvas.width / this.canvas.height;
            if(screenRatio>this.originRatio){ // 描画部分がセーフティゾーンより横長なら
                if(this.originRatio>=1.0){ // セーフティゾーンが横長画面なら
                    return [ screenRatio, 1.0, this.originRatio, 1.0];
                }else{ // セーフティゾーンが縦長画面なら
                    return [ screenRatio/this.originRatio, 1.0/this.originRatio, 1.0, 1.0/this.originRatio];
                }
            }else{ // 描画部分がセーフティゾーンより縦長なら
                if(this.originRatio>=1.0){ // セーフティゾーンが横長画面なら
                    return [ this.originRatio, this.originRatio/screenRatio, this.originRatio, 1.0];
                }else{ // セーフティゾーンが縦長画面なら
                    return [1.0, 1.0/screenRatio, 1.0, 1.0/this.originRatio];
                }
            }
        }
    }

    // 実画面のサイズが変更されたときに実行される。必要に応じてオーバーライド
    // キャンバスの描画可能エリアをすべて
    catchWindowResizeEvent(visibleHeight,visibleWidth) {
        if(this.pixelperfect){ // 実画面のピクセルに合わせる
            if(this.clip){
                /////const [H,W] = this.originSize;
                /////const screenRatio = W / H;
                this.canvas.height = parseInt( Math.min(visibleHeight, visibleWidth /this.originRatio) );
                this.canvas.width  = parseInt( Math.min(visibleWidth,  visibleHeight*this.originRatio) );
                this.clear();
            }else{
                this.canvas.height = visibleHeight;
                this.canvas.width  = visibleWidth;
                this.clear();
            }
        }else{
            if(this.clip){
                return;
            }else{
                const [H,W] = this.originSize;
                /////const screenRatio = W / H;
                if(this.originRatio>visibleWidth/visibleHeight){ // 縦長
                    this.canvas.height = parseInt( W*(visibleHeight/visibleWidth) );
                    this.canvas.width  = W;
                }else{  // 横長
                    this.canvas.height = H;
                    this.canvas.width  = parseInt( H*(visibleWidth/visibleHeight) );
                }
                this.clear();
            }
        }
    }
}
