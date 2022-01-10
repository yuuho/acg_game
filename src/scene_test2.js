'use strict';

import SceneBase from './scenebase.js';
import GLUtil from './glutil.js';
import StringUtil from './strutil.js';
import OffScreen from './offscreen.js';
import {Controller} from './controller.js';
// 遷移先
import StartScene from './scene_start.js';


const vshader = `\
#version 300 es
in vec3 pos;
in vec3 coli;
in vec2 tpos;
uniform float Xlim;
uniform float Ylim;
out vec3 colo;
out vec2 texturecoord;

void main() {
    colo = coli;
    texturecoord = tpos;
    gl_Position = vec4( pos, 1.0) / vec4(Xlim,Ylim,1.0,1.0);
}
`;

const fshader = `\
#version 300 es
precision mediump float;
in vec3 colo;
in vec2 texturecoord;
uniform sampler2D strings;
out vec4 color_out;

void main() {
    if(texturecoord.x<0.0){
        color_out = vec4(colo,1.0);
    }else{
        float mask = texture(strings, texturecoord).x;
        color_out = vec4(colo, mask);
    }
}
`;



export default class Test2Scene extends SceneBase{

    static sceneName = "FullScreen & SceneChange";

    scene_initialize() {
        this.gameResolution = this.sceneMg.config.gameResolution;
        this.textureResolution = this.sceneMg.config.textureResolution;
        const [w,h] = this.gameResolution;
        this.offScreen = new OffScreen(h,w, 'webgl2', false,false);
        this.controller = new Controller( this.timer );

        this.cursor = 0;
        this.ctrlHist = {'ArrowUp':{}, 'ArrowDown':{}, 'Enter':{}};

        this.menuList = [ {'name':'back', 'scene':StartScene} ]

        this.gl = this.offScreen.context;
        this.program = GLUtil.createProgram(this.gl, vshader, fshader);
        this.gl.useProgram(this.program);

        // 使用する文字列をテクスチャとして生成
        this.strings = [];
        this.strings = this.strings.concat(['back with enter key']);
        this.strings = this.strings.concat(this.menuList.map(x=>x.name));
        const stringPtr = this.gl.getUniformLocation(this.program, 'strings');
        let stringCvs; [stringCvs, this.stringRatios]
                    = StringUtil.multi_string_square(this.strings, 2048, 100);
        const texObj = GLUtil.createTexture(this.gl, stringCvs,    2048);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texObj);
        this.gl.uniform1i(stringPtr, 0);
    }

    enter() {
        // 解像度の設定を見て変更があればやり直し
        if( (this.gameResolution !== this.sceneMg.config.gameResolution)
            || (this.textureResolution !== this.sceneMg.config.textureResolution) ){
            this.scene_initialize();
        }

        this.realScreen.setScene( this );
        this.controller.activate();
    }

    exit() {
        this.controller.deactivate();
    }

    render() {
        { // カーソル位置(どこを選択しているか)把握
            let cursordiff = 0;
            let enter = false;
            for(let key in this.ctrlHist){ // このシーンで受け付ける種類のキーについて処理していく
                if(this.controller.KeyBoard[key].length===0) continue; // キーが押されていないなら処理の必要なし
                for(let i=this.controller.KeyBoard[key].length-1;i>=0;i--){ // 最新のキー入力から処理していく
                    if(!('end' in this.controller.KeyBoard[key][i])) continue;// まだ押しっぱなしのキーなら無視
                    const id = this.controller.KeyBoard[key][i].start+        // そのキー入力固有のIDを作成
                                    '_'+this.controller.KeyBoard[key][i].end; //   (キー押し->離し時刻で)
                    if(id in this.ctrlHist[key]) break; // このシーンでもう処理済みのキー入力なら無視
                    this.ctrlHist[key][id] = 'done'; // このシーンでもう処理したキー入力として記憶
                    if(key==='ArrowUp')         cursordiff -= 1; // ↑
                    else if(key==='ArrowDown')  cursordiff += 1; // ↓
                    else                        enter = true;    // Enter
                }
            }
            // 現在のカーソル位置を求める
            this.cursor = ( (this.cursor+cursordiff)%this.menuList.length
                                +this.menuList.length)%this.menuList.length;
            // エンターキーをが押されていたならシーン変更
            if(enter){
                console.log(this.menuList[this.cursor].name);
                this.sceneMg.changeScene( this.menuList[this.cursor].scene.sceneName,
                                        this.menuList[this.cursor].scene);
            }
        }

        { // 描画範囲の座標限界を設定
            [this.Xlim,this.Ylim,this.sXlim,this.sYlim] = this.offScreen.getXYlims();
            const XlimPtr = this.gl.getUniformLocation(this.program, 'Xlim');
            const YlimPtr = this.gl.getUniformLocation(this.program, 'Ylim');
            this.gl.uniform1f(XlimPtr, this.Xlim);
            this.gl.uniform1f(YlimPtr, this.Ylim);
        }

        // 描画オブジェクトデータ
        let tmpIDX = 0;
        this.vdata = []; this.vdim = 3; // 頂点座標
        this.cdata = []; this.cdim = 3; // 頂点カラー
        this.tdata = []; this.tdim = 2; // テクスチャ座標
        this.idata = []; this.idataL = []; // 三角形と線のインデックスバッファ
        // 設定
        this.depths = { 'back':0.5, 'btn':0.0, 'text':-0.5 };

        { // 背景データの作成
            const x = Math.sin( this.timer.tmpTime*0.003 );
            const y = Math.cos( this.timer.tmpTime*0.003 );
            const r0=0.2, r1=0.15, r2=0.1, r3=0.14;
            this.vdata = this.vdata.concat(
                [ 1.0+r0*(x+1.0),  1.0+r0*(y+1.0), this.depths.back,
                  1.0+r1*(x+1.0), -1.0+r1*(y-1.0), this.depths.back,
                 -1.0+r2*(x-1.0), -1.0+r2*(y-1.0), this.depths.back,
                 -1.0+r3*(x-1.0),  1.0+r3*(y+1.0), this.depths.back,
                ]);
            this.cdata = this.cdata.concat(
                [ 1.0,0.0,0.0, 0.0,1.0,0.0, 0.0,0.0,1.0, 1.0,0.0,1.0 ]);
            this.tdata = this.tdata.concat(
                [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ]); // none
            this.idata = this.idata.concat(
                [ tmpIDX+0, tmpIDX+1, tmpIDX+2,
                  tmpIDX+2, tmpIDX+3, tmpIDX+0 ]);
            tmpIDX += 4;
        }

        { // ボタン背景の描画
            const xl=-0.3, xr=0.3;
            const yt=0.2, h=0.15, hs=0.05;
            const selectedColor    = [ 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8];
            const notSelectedColor = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
            for(let i=0;i<this.menuList.length;i++){
                this.vdata = this.vdata.concat(
                    [ xl,yt-i*(h+hs)-0,this.depths.btn, xr,yt-i*(h+hs)-0,this.depths.btn,
                      xl,yt-i*(h+hs)-h,this.depths.btn, xr,yt-i*(h+hs)-h,this.depths.btn ]);
                this.cdata = this.cdata.concat(
                    this.cursor===i ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        }

        { // 文字列
            const th = 1.0/this.strings.length;
    
            // メッセージ
            const XL=-0.7, XR=0.7, YT=0.5, YB=0.3;
            this.vdata = this.vdata.concat(
                [ XL,YT,this.depths.text, XR,YT,this.depths.text,
                  XL,YB,this.depths.text, XR,YB,this.depths.text ]);
            this.cdata = this.cdata.concat(
                [ 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0 ] );
            this.tdata = this.tdata.concat(
                [ 0.0,0.0, 1.0,0.0, 0.0,th, 1.0,th ] );
            this.idata = this.idata.concat(
                [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
            tmpIDX += 4;

            // ボタン
            const xL=-0.5, xR=0.5;
            const yt=0.2, h=0.15, hs=0.05;
            const selectedColor    = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
            const notSelectedColor = [ 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3];
            for(let i=0;i<this.menuList.length;i++){
                const xl=xL*0.15*this.stringRatios[i+1];
                const xr=xR*0.15*this.stringRatios[i+1];
                this.vdata = this.vdata.concat(
                    [ xl,yt-i*(h+hs)-0,this.depths.text, xr,yt-i*(h+hs)-0,this.depths.text,
                      xl,yt-i*(h+hs)-h,this.depths.text, xr,yt-i*(h+hs)-h,this.depths.text ]);
                this.cdata = this.cdata.concat(
                    this.cursor===i ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    [ 0.0,th*(i+1), 1.0,th*(i+1), 0.0,th*(i+2), 1.0,th*(i+2) ] );
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        }

        { // 各種エリア境界の描画
            // それぞれのマージン
            const d0=0.02, d1 = 0.03, d2 = 0.04;

            // セーフティゾーン
            this.vdata = this.vdata.concat(
                [ -this.sXlim+d1, this.sYlim-d1,-1.0,  this.sXlim-d1, this.sYlim-d1,-1.0,
                  -this.sXlim+d1,-this.sYlim+d1,-1.0,  this.sXlim-d1,-this.sYlim+d1,-1.0]);
            this.cdata = this.cdata.concat(
                [1.0,0.0,0.0, 1.0,0.0,0.0, 1.0,0.0,0.0, 1.0,0.0,0.0]);
            this.tdata = this.tdata.concat(
                [-1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0]);
            this.idataL = this.idataL.concat(
                [ tmpIDX+0,tmpIDX+1, tmpIDX+0,tmpIDX+2, tmpIDX+1,tmpIDX+3, tmpIDX+2,tmpIDX+3 ]);
            tmpIDX += 4;

            // 正方形[-1.0,+1.0]
            this.vdata = this.vdata.concat(
                [ -1.0+d2, 1.0-d2,-1.0, 1.0-d2, 1.0-d2,-1.0,
                  -1.0+d2,-1.0+d2,-1.0, 1.0-d2,-1.0+d2,-1.0]);
            this.cdata = this.cdata.concat(
                [0.0,0.0,1.0, 0.0,0.0,1.0, 0.0,0.0,1.0, 0.0,0.0,1.0]);
            this.tdata = this.tdata.concat(
                [-1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0]);
            this.idataL = this.idataL.concat(
                [ tmpIDX+0,tmpIDX+1, tmpIDX+0,tmpIDX+2, tmpIDX+1,tmpIDX+3, tmpIDX+2,tmpIDX+3 ]);
            tmpIDX += 4;

            // 描画エリア全体
            this.vdata = this.vdata.concat(
                [ -this.Xlim+d0, this.Ylim-d0,-1.0, this.Xlim-d0, this.Ylim-d0,-1.0,
                  -this.Xlim+d0,-this.Ylim+d0,-1.0, this.Xlim-d0,-this.Ylim+d0,-1.0]);
            this.cdata = this.cdata.concat(
                [0.0,1.0,0.0, 0.0,1.0,0.0, 0.0,1.0,0.0, 0.0,1.0,0.0]);
            this.tdata = this.tdata.concat(
                [-1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0]);
            this.idataL = this.idataL.concat(
                [ tmpIDX+0,tmpIDX+1, tmpIDX+0,tmpIDX+2, tmpIDX+1,tmpIDX+3, tmpIDX+2,tmpIDX+3 ]);
            tmpIDX += 4;
        }

        // 描画処理
        this.vbo = GLUtil.createVBO(this.gl, this.vdata);
        this.cbo = GLUtil.createVBO(this.gl, this.cdata);
        this.tbo = GLUtil.createVBO(this.gl, this.tdata);
        this.ibo = GLUtil.createIBO(this.gl, this.idata);
        this.iboL= GLUtil.createIBO(this.gl, this.idataL);
        GLUtil.sendVBO(this.gl, this.program, 'pos',  this.vbo, this.vdim /*= VBO dim*/);
        GLUtil.sendVBO(this.gl, this.program, 'coli', this.cbo, this.cdim /*= VBO dim*/);
        GLUtil.sendVBO(this.gl, this.program, 'tpos', this.tbo, this.tdim /*= VBO dim*/);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);
        GLUtil.sendIBO(this.gl, this.ibo );
        this.gl.drawElements(this.gl.TRIANGLES, this.idata.length, this.gl.UNSIGNED_SHORT, 0);
        GLUtil.sendIBO(this.gl, this.iboL );
        this.gl.drawElements(this.gl.LINES, this.idataL.length, this.gl.UNSIGNED_SHORT, 0);

        this.gl.flush();
    }
}