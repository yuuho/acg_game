

class OffScreenBase{
    constructor( realScreen ) {
        this.realScreen = realScreen;

        this.canvas = document.createElement('canvas');
        this.canvas.height = 720;
        this.canvas.width = 1280;
        
        this.context = this.canvas.getContext('webgl2');
        this.context.clearColor(1.0, 1.0, 1.0, 1.0);
        this.context.clearDepth(1.0);
        // this.context.enable(this.context.CULL_FACE); // visualize counter clock wise triangle only
        this.context.enable(this.context.DEPTH_TEST);// depth test
        this.context.enable(this.context.BLEND);
        this.context.blendFunc(this.context.SRC_ALPHA, this.context.ONE_MINUS_SRC_ALPHA);
        this.context.clear(this.context.COLOR_BUFFER_BIT|this.context.DEPTH_BUFFER_BIT);
    }

    catchWindowResizeEvent(H,W) {

    }
}


class OffScreenHD extends OffScreenBase{
    constructor( realScreen ) {
        super( realScreen );
        this.canvas.height = 1080;
        this.canvas.width = 1920;
        this.context.viewport(0,0,1920,1080);
    }
}


class OffScreenFull extends OffScreenBase{
    constructor( realScreen ) {
        super( realScreen );
        this.canvas.height = realScreen.canvas.height;
        this.canvas.width = realScreen.canvas.width;
        this.context.viewport(0,0, realScreen.canvas.width,
                                   realScreen.canvas.height);
    }

    catchWindowResizeEvent(H,W) {
        this.canvas.height = H;
        this.canvas.width = W;
        this.context.viewport(0,0, W,H);
    }
}


export { OffScreenFull, OffScreenHD };