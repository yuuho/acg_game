'use strict';

import SceneBase from './scenebase.js';
import GLUtil from './glutil.js';
import OffScreen from './offscreen.js';
import {Controller} from './controller.js';


// vshader {{{
const vshader = `\
#version 300 es
in vec4 pos;

void main() {
    gl_Position = pos;
}
`; // }}}

// fshader {{{
const fshader = `\
#version 300 es
precision mediump float;
out vec4 color_out;

void main() {
    color_out = vec4(0.1, 0.3, 0.8, 1.0);
}
`; // }}}


export default class GameScene extends SceneBase{

    static sceneName = 'GAME';

    scene_initialize(){
        this.offScreen = new OffScreen(720,1280);
        this.controller = new Controller( this.timer );

        // TODO
        // this.ctrlHist = {'ArrowUp':{}, 'ArrowDown':{}, 'Enter':{}};

        this.gl = this.offScreen.context;
        this.program = GLUtil.createProgram(this.gl, vshader, fshader);
        this.gl.useProgram(this.program);
    }

    render() {

        // コントロール部分 取っておく TODO 操作
        // let cursordiff = 0;
        // let enter = false;
        // for(let key in this.ctrlHist){
        //     if(this.controller.KeyBoard[key].length===0) continue;
        //     for(let i=this.controller.KeyBoard[key].length-1;i>=0;i--){
        //         if(!('end' in this.controller.KeyBoard[key][i])) break;
        //         const id = this.controller.KeyBoard[key][i].start+
        //                         '_'+this.controller.KeyBoard[key][i].end;
        //         if(id in this.ctrlHist[key]) break;
        //         this.ctrlHist[key][id] = 'done';
        //         if(key==='ArrowUp')         cursordiff -= 1;
        //         else if(key==='ArrowDown')  cursordiff += 1;
        //         else                        enter = true;
        //     }
        // }
        // this.cursor = (this.cursor+cursordiff+this.menuList.length*10)%this.menuList.length;
        // if(enter){
        //     console.log(this.menuList[this.cursor].name);
        // }

        // 描画するものを作る
        // const x = Math.sin( this.timer.tmpTime*0.003 );
        // const y = Math.cos( this.timer.tmpTime*0.003 );
        // const r0=0.2, r1=0.15, r2=0.1, r3=0.14;
        // const xl=-0.3, xr=0.3;
        // const yt=0.2, h = 0.15, hs=0.05;
        // this.vdata = [ 1.0+r0*(x+1.0), 1.0+r0*(y+1.0),0.5, // 0
        //                1.0+r1*(x+1.0),-1.0+r1*(y-1.0),0.5, // 1
        //               -1.0+r2*(x-1.0),-1.0+r2*(y-1.0),0.5, // 2
        //               -1.0+r3*(x-1.0), 1.0+r3*(y+1.0),0.5, // 3
        //               xl,yt-0*(h+hs)-0,0.0, xr,yt-0*(h+hs)-0,0.0, xl,yt-0*(h+hs)-h,0.0, xr,yt-0*(h+hs)-h,0.0, //  4, 5, 6, 7
        //               xl,yt-1*(h+hs)-0,0.0, xr,yt-1*(h+hs)-0,0.0, xl,yt-1*(h+hs)-h,0.0, xr,yt-1*(h+hs)-h,0.0, //  8, 9,10,11
        //               xl,yt-2*(h+hs)-0,0.0, xr,yt-2*(h+hs)-0,0.0, xl,yt-2*(h+hs)-h,0.0, xr,yt-2*(h+hs)-h,0.0, // 12,13,14,15
        //               xl,yt-3*(h+hs)-0,0.0, xr,yt-3*(h+hs)-0,0.0, xl,yt-3*(h+hs)-h,0.0, xr,yt-3*(h+hs)-h,0.0, // 16,17,18,19
        //                ];
        // this.vdim = 3;
        // this.vbo = GLUtil.createVBO(this.gl, this.vdata );

        // const selected    = [ 0.4,0.8,0.3, 0.4,0.8,0.3, 0.4,0.8,0.3, 0.4,0.8,0.3];
        // const notselected = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
        // this.cdata = [ 1.0,0.0,0.0, 0.0,1.0,0.0, 0.0,0.0,1.0, 1.0,0.0,1.0 ];
        // const merge = arr=>Array.prototype.push.apply(this.cdata,arr);
        // if(this.cursor===0) merge(selected); else merge(notselected);
        // if(this.cursor===1) merge(selected); else merge(notselected);
        // if(this.cursor===2) merge(selected); else merge(notselected);
        // if(this.cursor===3) merge(selected); else merge(notselected);
        // this.cdim = 3;
        // this.cbo = GLUtil.createVBO(this.gl, this.cdata );

        // this.idata = [ 0,1,2,  2,3,0,
        //                4,5,6,  6,5,7, 8,9,10, 10,9,11, 12,13,14,14,13,15, 16,17,18,18,17,19 ];
        // this.ibo = GLUtil.createIBO(this.gl, this.idata );

        this.ramiel_vertices = new Float32Array([
            0, 1, 0,
            0, 0, 1,
            1, 0, 0,
            0, -1,0,
            0, 0,-1,
            -1,0, 0,
            0,-1, 0,
            0, 0, 1,
            -1,0, 0,
            0, 1, 0,
            0, 0,-1,
            1, 0, 0
        ]);
        this.ramiel_vbo = GLUtil.createVBO(this.gl, this.ramiel_vertices);

        // 描画処理
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);
        GLUtil.sendVBO(this.gl, this.program, 'pos',  this.ramiel_vbo, 3/*= VBO dim*/);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 12);
        this.gl.flush();
    }

}
