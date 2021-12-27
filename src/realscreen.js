

// リサイズされたとき
function windowResize( screenObj ){
    if( screenObj.offScreen===null ) return;

    const H = screenObj.canvas.height = document.body.clientHeight;
    const W = screenObj.canvas.width  = document.body.clientWidth;
    
    // 念の為、オフスクリーンにサイズ変更を知らせる
    screenObj.offScreen.catchWindowResizeEvent(H,W);

    // 実画面が仮想画面より縦長かどうかを見て描画範囲を決める
    const screenRatio = screenObj.offScreen.canvas.width / screenObj.offScreen.canvas.height;
    screenObj.renderPosition.sx = parseInt((W-Math.min(W,H*screenRatio))/2);
    screenObj.renderPosition.dx = parseInt(   Math.min(W,H*screenRatio)   );
    screenObj.renderPosition.sy = parseInt((H-Math.min(H,W/screenRatio))/2);
    screenObj.renderPosition.dy = parseInt(   Math.min(H,W/screenRatio)   );

    // 描画する
    screenObj.renderOffScreen();
}


class RealScreen{

    constructor() { /* Singleton */ }

    initialize() { // Singleton Constructor
        // set CSS
        document.documentElement.style.margin = '0';
        document.documentElement.style.height = '100%';
        document.body.style.margin = '0';
        document.body.style.height = '100%';
        // make canvas
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
        this.canvas.style.height = '100%';
        this.canvas.style.width = '100%';
        // make  canvas2d context
        this.context = this.canvas.getContext('2d');
        this.context.fillStyle = "rgb(0,0,0)";

        // resizing function
        this.offScreen = null;
        this.renderPosition = {'sx': 0, 'sy': 0, 'dx': 0, 'dy': 0};
        this.resizePID = null;
        window.addEventListener('resize',()=>{
            window.clearTimeout(this.resizePID);
            this.resizePID = window.setTimeout(windowResize, /*waiting time=*/ 30, this); // [SETTING]
        },false);

        windowResize(this);
    }

    setOffScreen( offScreen ) {
        this.offScreen = offScreen;
        windowResize(this);
    }

    renderOffScreen() {
        // 一度黒く塗りつぶしてから描画
        this.context.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.context.drawImage( this.offScreen.canvas,
                        this.renderPosition.sx, this.renderPosition.sy,
                        this.renderPosition.dx, this.renderPosition.dy );
    }

}

export default new RealScreen();
