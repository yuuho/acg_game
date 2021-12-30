
import SceneBase from './scenebase.js';
import GLUtil from './glutil.js';
import StringUtil from './strutil.js';
import {OffScreenHD} from './offscreen.js';
import {Controller} from './controller.js';
// 遷移先
import StartScene from './scene_start.js';


const vshader = `\
#version 300 es
in vec3 pos;
in vec3 coli;
in vec2 tpos;
out vec3 colo;
out vec2 texturecoord;

void main() {
    colo = coli;
    texturecoord = tpos;
    gl_Position = vec4( pos, 1.0);
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



export default class Test1Scene extends SceneBase{

    static sceneName = "Test1";

    scene_initialize(){
        this.offScreen = new OffScreenHD( this.realScreen );
        this.controller = new Controller( this.timer );

        this.cursor = 0;
        this.ctrlHist = {'ArrowUp':{}, 'ArrowDown':{}, 'Enter':{}};

        this.menuList = [ {'name':'back', 'scene':StartScene} ]

        this.gl = this.offScreen.context;
        this.program = GLUtil.createProgram(this.gl, vshader, fshader);
        this.gl.useProgram(this.program);
    }

    render() {

        // どこを選択しているか把握
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
            this.sceneMg.changeScene( this.menuList[this.cursor].scene.sceneName,
                                      this.menuList[this.cursor].scene);
        }

        /////////

        let tmpIDX = 0;
        const array_append = (arr1,arr2)=>Array.prototype.push.apply(arr1,arr2);

        // vbo, cbo, tbo, ibo
        this.vdata = []; this.vdim = 3; // 頂点座標
        this.cdata = []; this.cdim = 3; // 頂点カラー
        this.tdata = []; this.tdim = 2; // テクスチャ座標
        this.idata = [];
        this.strings = [];
        // 設定
        this.depths = { 'back':0.5, 'btn':0.0, 'text':-0.5 };

        (()=>{ // 背景データの作成
            const x = Math.sin( this.timer.tmpTime*0.003 );
            const y = Math.cos( this.timer.tmpTime*0.003 );
            const r0=0.2, r1=0.15, r2=0.1, r3=0.14;
            array_append(this.vdata,
                [ 1.0+r0*(x+1.0),  1.0+r0*(y+1.0), this.depths.back,
                  1.0+r1*(x+1.0), -1.0+r1*(y-1.0), this.depths.back,
                 -1.0+r2*(x-1.0), -1.0+r2*(y-1.0), this.depths.back,
                 -1.0+r3*(x-1.0),  1.0+r3*(y+1.0), this.depths.back,
                ]);
            array_append(this.cdata,
                [ 1.0,0.0,0.0, 0.0,1.0,0.0, 0.0,0.0,1.0, 1.0,1.0,0.0 ]);
            array_append(this.tdata,
                [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ]); // none
            array_append(this.idata,
                [ tmpIDX+0, tmpIDX+1, tmpIDX+2,
                  tmpIDX+2, tmpIDX+3, tmpIDX+0 ]);
            tmpIDX += 4;
        })();

        (()=>{ // ボタン背景の描画
            const xl=-0.3, xr=0.3;
            const yt=0.2, h=0.15, hs=0.05;
            const selectedColor    = [ 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8];
            const notSelectedColor = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
            for(let i=0;i<this.menuList.length;i++){
                array_append(this.vdata,
                    [ xl,yt-i*(h+hs)-0,this.depths.btn, xr,yt-i*(h+hs)-0,this.depths.btn,
                      xl,yt-i*(h+hs)-h,this.depths.btn, xr,yt-i*(h+hs)-h,this.depths.btn ]);
                array_append(this.cdata,
                    this.cursor===i ? selectedColor : notSelectedColor );
                array_append(this.tdata,
                    [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                array_append(this.idata,
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        })();

        (()=>{ // 文字列
            ///// テクスチャ設定
            array_append(this.strings, ['back with enter key']);
            for(let i=0;i<this.menuList.length;i++){
                array_append(this.strings, [this.menuList[i].name]);
            }
            const stringPtr = this.gl.getUniformLocation(this.program, 'strings');
            const [stringCvs,stringRatios]
                        = StringUtil.multi_string_square(this.strings, 2048, 100);
            const texObj = GLUtil.createTexture(this.gl, stringCvs,    2048);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texObj);
            this.gl.uniform1i(stringPtr, 0);
            const th = 1.0/this.strings.length;
    
            ///// タイトル
            const XL=-0.35, XR=0.35, YT=0.5, YB=0.3;
            array_append(this.vdata,
                [ XL,YT,this.depths.text, XR,YT,this.depths.text,
                  XL,YB,this.depths.text, XR,YB,this.depths.text ]);
            array_append(this.cdata,
                [ 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0 ] );
            array_append(this.tdata,
                [ 0.0,0.0, 1.0,0.0, 0.0,th, 1.0,th ] );
            array_append(this.idata,
                [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
            tmpIDX += 4;

            ///// ボタン
            const xL=-0.3, xR=0.3;
            const yt=0.2, h=0.15, hs=0.05;
            const selectedColor    = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
            const notSelectedColor = [ 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3];
            for(let i=0;i<this.menuList.length;i++){
                const xl=xL*0.15*stringRatios[i+1];
                const xr=xR*0.15*stringRatios[i+1];
                array_append(this.vdata,
                    [ xl,yt-i*(h+hs)-0,this.depths.text, xr,yt-i*(h+hs)-0,this.depths.text,
                      xl,yt-i*(h+hs)-h,this.depths.text, xr,yt-i*(h+hs)-h,this.depths.text ]);
                array_append(this.cdata,
                    this.cursor===i ? selectedColor : notSelectedColor );
                array_append(this.tdata,
                    [ 0.0,th*(i+1), 1.0,th*(i+1), 0.0,th*(i+2), 1.0,th*(i+2) ] );
                array_append(this.idata,
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        })();

        this.vbo = GLUtil.createVBO(this.gl, this.vdata);
        this.cbo = GLUtil.createVBO(this.gl, this.cdata);
        this.tbo = GLUtil.createVBO(this.gl, this.tdata);
        this.ibo = GLUtil.createIBO(this.gl, this.idata);
        GLUtil.sendVBO(this.gl, this.program, 'pos',  this.vbo, this.vdim /*= VBO dim*/);
        GLUtil.sendVBO(this.gl, this.program, 'coli', this.cbo, this.cdim /*= VBO dim*/);
        GLUtil.sendVBO(this.gl, this.program, 'tpos', this.tbo, this.tdim /*= VBO dim*/);
        GLUtil.sendIBO(this.gl, this.ibo );

        // 描画処理
        this.gl.clear(this.gl.COLOR_BUFFER_BIT|this.gl.DEPTH_BUFFER_BIT);
        this.gl.drawElements(this.gl.TRIANGLES, this.idata.length, this.gl.UNSIGNED_SHORT, 0);
        this.gl.flush();

        this.realScreen.renderOffScreen();
    }

}