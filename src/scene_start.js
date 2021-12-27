
import SceneBase from './scenebase.js';
import GLUtil from './glutil.js';
import {OffScreenHD} from './offscreen.js';

import GameScene from './scene_game.js';


const vshader = `\
#version 300 es
in vec3 pos;
in vec3 coli;
//uniform float time;
out vec3 colo;

void main() {
    colo = coli;
    ///float x = sin(time*0.01) * 0.5;
    ///float y = cos(time*0.01) * 0.5;
    ///gl_Position = vec4( pos*0.5+vec2(x,y), 1.0);
    gl_Position = vec4( pos, 1.0);
}
`;

const fshader = `\
#version 300 es
precision mediump float;
in vec3 colo;
out vec4 color_out;

void main() {
    color_out = vec4(colo, 1.0);
}
`;



export default class StartScene extends SceneBase{


    constructor( realScreen, controller, sceneMg ){
        super();
        this.realScreen = realScreen;
        this.controller = controller;
        this.sceneMg = sceneMg;
        this.offScreen = new OffScreenHD( realScreen );

        this.cursor = 0;
        this.ctrlHist = {'ArrowUp':{}, 'ArrowDown':{}, 'Enter':{}};

        this.menuList = [{'name':'GAME',   'scene':GameScene},
                         {'name':'DUMMY1', 'scene':null},
                         {'name':'DUMMY2', 'scene':null},
                         {'name':'CONFIG', 'scene':null},]

        this.gl = this.offScreen.context;
        this.program = GLUtil.createProgram(this.gl, vshader, fshader);
        this.gl.useProgram(this.program);
    }

    render( timer ) {

        let cursordiff = 0;
        let enter = false;
        for(let key in this.ctrlHist){
            if(this.controller.KeyBoard[key].length===0) continue;
            for(let i=this.controller.KeyBoard[key].length-1;i>=0;i--){
                if(!('end' in this.controller.KeyBoard[key][i])) break;
                const id = this.controller.KeyBoard[key][i].start+
                                '_'+this.controller.KeyBoard[key][i].end;
                if(id in this.ctrlHist[key]) break;
                this.ctrlHist[key][id] = 'done';
                if(key==='ArrowUp')         cursordiff -= 1;
                else if(key==='ArrowDown')  cursordiff += 1;
                else                        enter = true;
            }
        }
        this.cursor = (this.cursor+cursordiff+this.menuList.length*10)%this.menuList.length;
        if(enter){
            console.log(this.menuList[this.cursor].name);
            this.sceneMg.changeScene(this.menuList[this.cursor].name, this.menuList[this.cursor].scene);
        }


        // 描画するものを作る
        const x = Math.sin( timer.tmpTime*0.003 );
        const y = Math.cos( timer.tmpTime*0.003 );
        const r0=0.2, r1=0.15, r2=0.1, r3=0.14;
        const xl=-0.3, xr=0.3;
        const yt=0.2, h = 0.15, hs=0.05;
        this.vdata = [ 1.0+r0*(x+1.0), 1.0+r0*(y+1.0),0.5, // 0
                       1.0+r1*(x+1.0),-1.0+r1*(y-1.0),0.5, // 1
                      -1.0+r2*(x-1.0),-1.0+r2*(y-1.0),0.5, // 2
                      -1.0+r3*(x-1.0), 1.0+r3*(y+1.0),0.5, // 3
                      xl,yt-0*(h+hs)-0,0.0, xr,yt-0*(h+hs)-0,0.0, xl,yt-0*(h+hs)-h,0.0, xr,yt-0*(h+hs)-h,0.0, //  4, 5, 6, 7
                      xl,yt-1*(h+hs)-0,0.0, xr,yt-1*(h+hs)-0,0.0, xl,yt-1*(h+hs)-h,0.0, xr,yt-1*(h+hs)-h,0.0, //  8, 9,10,11
                      xl,yt-2*(h+hs)-0,0.0, xr,yt-2*(h+hs)-0,0.0, xl,yt-2*(h+hs)-h,0.0, xr,yt-2*(h+hs)-h,0.0, // 12,13,14,15
                      xl,yt-3*(h+hs)-0,0.0, xr,yt-3*(h+hs)-0,0.0, xl,yt-3*(h+hs)-h,0.0, xr,yt-3*(h+hs)-h,0.0, // 16,17,18,19
                       ];
        this.vdim = 3;
        this.vbo = GLUtil.createVBO(this.gl, this.vdata );

        const selected    = [ 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3];
        const notselected = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
        this.cdata = [ 1.0,0.0,0.0, 0.0,1.0,0.0, 0.0,0.0,1.0, 1.0,0.0,1.0 ];
        const merge = arr=>Array.prototype.push.apply(this.cdata,arr);
        if(this.cursor===0) merge(selected); else merge(notselected);
        if(this.cursor===1) merge(selected); else merge(notselected);
        if(this.cursor===2) merge(selected); else merge(notselected);
        if(this.cursor===3) merge(selected); else merge(notselected);
        this.cdim = 3;
        this.cbo = GLUtil.createVBO(this.gl, this.cdata );

        this.idata = [ 0,1,2,  2,3,0,
                       4,5,6,  6,5,7, 8,9,10, 10,9,11, 12,13,14,14,13,15, 16,17,18,18,17,19 ];
        this.ibo = GLUtil.createIBO(this.gl, this.idata );


        // 描画処理
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);
        //this.gl.uniform1f(this.timePtr, timer.tmpTime);
        GLUtil.sendVBO(this.gl, this.program, 'pos',  this.vbo, this.vdim /*= VBO dim*/);
        GLUtil.sendVBO(this.gl, this.program, 'coli', this.cbo, this.cdim /*= CBO dim*/);
        GLUtil.sendIBO(this.gl, this.ibo );
        this.gl.drawElements(this.gl.TRIANGLES, this.idata.length, this.gl.UNSIGNED_SHORT, 0);
        this.gl.flush();

        this.realScreen.renderOffScreen();
    }

}