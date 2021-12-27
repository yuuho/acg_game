import { OffScreenHD } from './offscreen.js';


export default class SceneBase {

    constructor( realScreen, controller, sceneMg ){
        this.realScreen = realScreen;
        this.controller = controller;
        this.sceneMg = sceneMg;
        this.offScreen = new OffScreenHD( realScreen );
    }

    enter() {
        this.realScreen.setOffScreen( this.offScreen );
    }

    render( timer ) {
        this.realScreen.renderOffScreen();
    }

    exit() {

    }

}

