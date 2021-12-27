

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
        // this.context.enable(this.context.DEPTH_TEST);// depth test
        this.context.clear(this.context.COLOR_BUFFER_BIT|this.context.DEPTH_BUFFER_BIT);
    }

    catchWindowResizeEvent(H,W) {

    }
}


class OffScreenHD extends OffScreenBase{
    hoge() {}
}


class OffScreenFull extends OffScreenBase{
    fuga() {}
}


export { OffScreenFull, OffScreenHD};
//export default OffScreenHD;