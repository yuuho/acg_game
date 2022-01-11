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
in vec3 pos;  // vertex position
in vec3 coli; // vertex color input
in vec2 tpos; // texture position
uniform float Xlim;
uniform float Ylim;
out vec3 colo; // vertex color output
out vec2 texturecoord; // texture position
out vec2 posi;

void main() {
    colo = coli;
    texturecoord = tpos;
    posi = pos.xy;
    gl_Position = vec4( pos, 1.0) / vec4(Xlim,Ylim,1.0,1.0);
}
`;

const fshader = `\
#version 300 es
precision mediump float;
in vec3 colo;
in vec2 texturecoord;
in vec2 posi;
uniform float sXlim;
uniform float sYlim;
uniform sampler2D strings;
out vec4 color_out;

void main() {
    vec4 ctmp;
    if(texturecoord.x<0.0){
        ctmp = vec4(colo,1.0);
    }else{
        float mask = texture(strings, texturecoord).x;
        ctmp = vec4(colo, mask);
    }

    if( posi.x<-sXlim || posi.x>sXlim || posi.y<-sYlim || posi.y>sYlim ){
        color_out = mix(ctmp, vec4(vec3(0.0),1.0), 0.2);
    }else{
        color_out = ctmp;
    }
}
`;



export default class ConfigScene extends SceneBase{

    static sceneName = "Config";

    scene_initialize() {
        this.gameResolution = this.sceneMg.config.gameResolution;
        this.textureResolution = this.sceneMg.config.textureResolution;
        const [w,h] = this.gameResolution;
        this.offScreen = new OffScreen(h,w, 'webgl2', false, false);
        this.controller = new Controller( this.timer );

        // シェーダコンパイル等
        this.gl = this.offScreen.context;
        this.program = GLUtil.createProgram(this.gl, vshader, fshader);
        this.gl.useProgram(this.program);


        this.cursor = 0;
        this.cursorSub = 0;
        this.ctrlHist = {'ArrowUp'  :{}, 'ArrowDown' :{},
                         'ArrowLeft':{}, 'ArrowRight':{}, 'Enter':{}};


        // UI 要素の定義
        this.uiList = [ {'type':'buttons', 'list' :["SET DEFAULT"],                                                                       'selectedID':0   },
                        {'type':'choices', 'label':"Display Resolution", 'observe':'displayResolution', 'list':null, 'selectedName':null, 'selectedID':null},
                        {'type':'choices', 'label':"Game Resolution",    'observe':'gameResolution',    'list':null, 'selectedName':null, 'selectedID':null},
                        {'type':'choices', 'label':"Texture Resolution", 'observe':'textureResolution', 'list':null, 'selectedName':null, 'selectedID':null},
                        {'type':'choices', 'label':"Frame Rate",         'observe':'frameRate',         'list':null, 'selectedName':null, 'selectedID':null},
                        {'type':'buttons', 'list' :["CANCEL", "CONFIRM"],                                                                 'selectedID':1   }];

        // 選択肢用文字列をセット
        const cfg = this.sceneMg.config;
        for(let i=0;i<this.uiList.length;i++){
            if(this.uiList[i].type==='choices')
                this.uiList[i].list = Object.keys( cfg[this.uiList[i].observe+'Choices'] );
        }

        // 使用する全文字列をリストアップ
        this.strings = ['CONFIG']; // シーンタイトル
        for(let i=0;i<this.uiList.length;i++){
            if(this.uiList[i].type==='choices')
                this.strings.push( this.uiList[i].label );
            this.strings = this.strings.concat(this.uiList[i].list);
        }

        // 文字列テクスチャを生成
        const stringPtr = this.gl.getUniformLocation(this.program, 'strings');
        let stringCvs; [stringCvs, this.texPoss, this.strDatas]
            = StringUtil.get_string_texture( this.strings, this.textureResolution );
        const texObj = GLUtil.createTexture(this.gl, stringCvs, this.textureResolution );
        this.gl.bindTexture(this.gl.TEXTURE_2D, texObj);
        this.gl.uniform1i(stringPtr, 0);
        // 文字列高さの最大値などを取得しておく (レンダリング時に基準点を揃えるため)
        this.str_descent_max = Math.max( ...this.strDatas.map(v=>v.descent) );
        this.str_height_max  = this.str_descent_max + Math.max( ...this.strDatas.map(v=>v.ascent) );
    }

    enter() {
        // 解像度の設定を見て変更があればやり直し
        if( (this.gameResolution.toString() !== this.sceneMg.config.gameResolution.toString())
            || (this.textureResolution !== this.sceneMg.config.textureResolution) ){
            this.scene_initialize();
        }

        // ここで現在の設定を確認して choices の selectedName selectedID を初期化する
        const search = (obj,v)=>Object.keys(obj).filter( k=>obj[k].toString()===v.toString() )[0];
        for(let i=0;i<this.uiList.length;i++){
            if(this.uiList[i].type==='choices'){
                this.uiList[i].selectedName = search( this.sceneMg.config[ this.uiList[i].observe+"Choices"],
                                                      this.sceneMg.config[ this.uiList[i].observe] );
                this.uiList[i].selectedID = this.uiList[i].list.indexOf( this.uiList[i].selectedName );
            }
        }

        // 画面に映すものとしてこのシーンを設定、このシーンのコントローラーを有効化
        this.realScreen.setScene( this );
        this.controller.activate();
    }

    exit() {
        this.controller.deactivate();
    }
    
    render() {

        {
            // どこを選択しているか把握
            let cursordiff = 0, cursorsdiff = 0;
            let enter = false;
            for(let key in this.ctrlHist){ // このシーンで受け付ける種類のキーについて処理していく
                if(this.controller.KeyBoard[key].length===0) continue; // キーが押されていないなら処理の必要なし
                for(let i=this.controller.KeyBoard[key].length-1;i>=0;i--){ // 最新のキー入力から処理していく
                    if(!('end' in this.controller.KeyBoard[key][i])) continue;// まだ押しっぱなしのキーなら無視
                    const id = this.controller.KeyBoard[key][i].start+        // そのキー入力固有のIDを作成
                                    '_'+this.controller.KeyBoard[key][i].end; //   (キー押し->離し時刻で)
                    if(id in this.ctrlHist[key]) break; // このシーンでもう処理済みのキー入力なら無視
                    this.ctrlHist[key][id] = 'done'; // このシーンでもう処理したキー入力として記憶
                    if(key==='ArrowUp')         cursordiff  -= 1; // ↑
                    else if(key==='ArrowDown')  cursordiff  += 1; // ↓
                    else if(key==='ArrowLeft')  cursorsdiff -= 1; // ←
                    else if(key==='ArrowRight') cursorsdiff += 1; // →
                    else                        enter = true;     // Enter
                }
            }
            // 現在のカーソル位置を求める
            this.cursor = ( (this.cursor+cursordiff)%this.uiList.length
                            +this.uiList.length)%this.uiList.length;
            // 現在のサブカーソルの位置を決める
            this.cursorSub = cursordiff!==0 ? this.uiList[this.cursor].selectedID : this.cursorSub;
            this.cursorSub = Math.min(Math.max(0,this.cursorSub+cursorsdiff), this.uiList[this.cursor].list.length-1);
            // ボタンの上でエンターキーが押されていたら
            if(this.uiList[this.cursor].type==='buttons' && enter){
                const bt = this.uiList[this.cursor].list[this.cursorSub];
                if(bt==='SET DEFAULT'){
                    const new_setting = this.sceneMg.config.default_setting();
                    for(let i=0;i<this.uiList.length;i++){
                        if(this.uiList[i].type==='choices'){
                            this.uiList[i].selectedName = new_setting[this.uiList[i].observe];
                            this.uiList[i].selectedID = this.uiList[i].list.indexOf( this.uiList[i].selectedName );
                        }
                    }
                }else if(bt==='CANCEL'){
                    this.sceneMg.changeScene( StartScene.sceneName, StartScene );
                }else if(bt==='CONFIRM'){
                    for(let i=0;i<this.uiList.length;i++){
                        if(this.uiList[i].type==='choices'){
                            this.sceneMg.config.set_param( this.uiList[i].observe, this.uiList[i].selectedName );
                        }
                    }
                    this.sceneMg.changeScene( StartScene.sceneName, StartScene );
                }else throw Error('not function');
            }

            this.uiList[this.cursor].selectedID = this.cursorSub;
            this.uiList[this.cursor].selectedName = this.uiList[this.cursor].list[this.cursorSub];
        }

        { // 描画範囲の座標限界を設定
            [this.Xlim,this.Ylim,this.sXlim,this.sYlim] = this.offScreen.getXYlims();
            const XlimPtr = this.gl.getUniformLocation(this.program, 'Xlim');
            const YlimPtr = this.gl.getUniformLocation(this.program, 'Ylim');
            this.gl.uniform1f(XlimPtr, this.Xlim);
            this.gl.uniform1f(YlimPtr, this.Ylim);
            const sXlimPtr = this.gl.getUniformLocation(this.program, 'sXlim');
            const sYlimPtr = this.gl.getUniformLocation(this.program, 'sYlim');
            this.gl.uniform1f(sXlimPtr, this.sXlim);
            this.gl.uniform1f(sYlimPtr, this.sYlim);
        }

        // 描画オブジェクトデータ
        let tmpIDX = 0;
        this.vdata = []; this.vdim = 3; // 頂点座標
        this.cdata = []; this.cdim = 3; // 頂点カラー
        this.tdata = []; this.tdim = 2; // テクスチャ座標
        this.idata = []; // 三角形のインデックスバッファ
        // 設定
        this.depths = { 'back':0.5, 'btn':0.0, 'text':-0.5 };

        {   // 背景データの作成
            const x = Math.sin( this.timer.tmpTime*0.003 );
            const y = Math.cos( this.timer.tmpTime*0.003 );
            const r0=0.2, r1=0.15, r2=0.1, r3=0.14;
            this.vdata = this.vdata.concat(
                [ this.Xlim+r0*(x+1.0),  this.Ylim+r0*(y+1.0), this.depths.back,
                  this.Xlim+r1*(x+1.0), -this.Ylim+r1*(y-1.0), this.depths.back,
                 -this.Xlim+r2*(x-1.0), -this.Ylim+r2*(y-1.0), this.depths.back,
                 -this.Xlim+r3*(x-1.0),  this.Ylim+r3*(y+1.0), this.depths.back,
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
            // ボタン色設定の定義
            const selectedColor    = [ 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8];
            const notSelectedColor = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
            
            const xr = this.sXlim*0.9;
            const bw = this.sXlim*0.45, bs = this.sXlim*0.06;
            const bh = this.sYlim* 0.18;
            
            // 上部ボタン背景の描画
            let yb = this.sYlim*0.6;
            let btID = 0
            for(let i=this.uiList[btID].list.length-1;i>=0;i--){
                const j = this.uiList[btID].list.length-1-i;
                this.vdata = this.vdata.concat(
                    [ xr-j*(bw+bs)-bw,yb+bh,this.depths.btn, xr-j*(bw+bs),yb+bh,this.depths.btn,
                      xr-j*(bw+bs)-bw,yb,   this.depths.btn, xr-j*(bw+bs),yb,   this.depths.btn ]);
                this.cdata = this.cdata.concat(
                    (this.cursor===btID && this.cursorSub===i) ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }

            // 下部ボタン背景の描画
            yb = -this.sYlim*0.83;
            btID = this.uiList.length-1;
            for(let i=this.uiList[btID].list.length-1;i>=0;i--){
                const j = this.uiList[btID].list.length-1-i;
                this.vdata = this.vdata.concat(
                    [ xr-j*(bw+bs)-bw,yb+bh,this.depths.btn, xr-j*(bw+bs),yb+bh,this.depths.btn,
                      xr-j*(bw+bs)-bw,yb,   this.depths.btn, xr-j*(bw+bs),yb,   this.depths.btn ]);
                this.cdata = this.cdata.concat(
                    (this.cursor===btID && this.cursorSub===i) ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        }

        { // 文字列
            // タイトル
            const XL=-0.8*this.sXlim, YT=this.sYlim*0.85, YB=this.sYlim*0.62;
            const XR = XL+(YT-YB)*(this.strDatas[0].paddedWidth/this.strDatas[0].paddedHeight);
            this.vdata = this.vdata.concat(
                [ XL,YT,this.depths.text, XR,YT,this.depths.text,
                  XL,YB,this.depths.text, XR,YB,this.depths.text ]);
            this.cdata = this.cdata.concat(
                [ 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0, 1.0,1.0,1.0 ] );
            this.tdata = this.tdata.concat(
                this.texPoss[0] );
            this.idata = this.idata.concat(
                [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
            tmpIDX += 4;
        }

        { // ボタン文字列
            const selectedColor    = [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7];
            const notSelectedColor = [ 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3, 0.8,0.3,0.3];

            const xr = this.sXlim*0.9;
            const bw = this.sXlim*0.45, bs = this.sXlim*0.06;
            const bh = this.sYlim* 0.18;

            // 上部ボタン背景の描画
            let yb = this.sYlim*0.6;
            let btID = 0
            for(let i=this.uiList[btID].list.length-1;i>=0;i--){
                const j = this.uiList[btID].list.length-1-i;
                const sID = this.strings.indexOf(this.uiList[btID].list[i]);
                const dY = (0.5*bh) *0.5;
                const dX = dY*(this.strDatas[sID].width/this.strDatas[sID].height);
                this.vdata = this.vdata.concat(
                    [ xr-j*(bw+bs)-bw*0.5-dX,yb+bh*0.5+dY,this.depths.text, xr-j*(bw+bs)-bw*0.5+dX,yb+bh*0.5+dY,this.depths.text,
                      xr-j*(bw+bs)-bw*0.5-dX,yb+bh*0.5-dY,this.depths.text, xr-j*(bw+bs)-bw*0.5+dX,yb+bh*0.5-dY,this.depths.text ]);
                this.cdata = this.cdata.concat(
                    (this.cursor===btID && this.cursorSub===i) ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    this.texPoss[ sID ] );
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }

            // 下部ボタン背景の描画
            yb = -this.sYlim*0.83;
            btID = this.uiList.length-1;
            for(let i=this.uiList[btID].list.length-1;i>=0;i--){
                const j = this.uiList[btID].list.length-1-i;
                const sID = this.strings.indexOf(this.uiList[btID].list[i]);
                const dY = (0.5*bh) *0.5;
                const dX = dY*(this.strDatas[sID].width/this.strDatas[sID].height);
                this.vdata = this.vdata.concat(
                    [ xr-j*(bw+bs)-bw*0.5-dX,yb+bh*0.5+dY,this.depths.text, xr-j*(bw+bs)-bw*0.5+dX,yb+bh*0.5+dY,this.depths.text,
                      xr-j*(bw+bs)-bw*0.5-dX,yb+bh*0.5-dY,this.depths.text, xr-j*(bw+bs)-bw*0.5+dX,yb+bh*0.5-dY,this.depths.text ]);
                this.cdata = this.cdata.concat(
                    (this.cursor===btID && this.cursorSub===i) ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    this.texPoss[ sID ] );
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        }

        { // セレクタ背景
            const selectedColor    = [ 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8, 0.3,0.3,0.8];
            const notSelectedColor = [ 0.3,0.3,0.3, 0.3,0.3,0.3, 0.3,0.3,0.3, 0.3,0.3,0.3];
            
            const xr = this.sXlim*0.8;
            const bw = this.sXlim*0.8, bs = this.sYlim*0.06;
            const bh = this.sYlim* 0.2;
            const Yt = this.sYlim*0.5;
            
            for(let i=1;i<this.uiList.length-1;i++){
                const yb = Yt - i*(bh+bs);
                this.vdata = this.vdata.concat(
                    [ xr-bw,yb+bh,this.depths.btn, xr,yb+bh,this.depths.btn,
                      xr-bw,yb,   this.depths.btn, xr,yb,   this.depths.btn ]);
                this.cdata = this.cdata.concat(
                    this.cursor===i ? selectedColor : notSelectedColor );
                this.tdata = this.tdata.concat(
                    [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        }

        { // セレクタ文字列
            
            const xr = this.sXlim*0.8;
            const bw = this.sXlim*0.8, bs = this.sYlim*0.06;
            const bh = this.sYlim* 0.2;
            const Yt = this.sYlim*0.5;
            
            // 選択肢文字列
            for(let i=1;i<this.uiList.length-1;i++){
                const sID = this.strings.indexOf(this.uiList[i].selectedName);
                const x = xr - 0.5*bw;
                const y = Yt - i*(bh+bs) + bh*(this.str_descent_max/this.str_height_max);
                const rate = 0.7;
                const du = this.strDatas[sID].ascent  / this.str_height_max * rate * bh;
                const dd = this.strDatas[sID].descent / this.str_height_max * rate * bh;
                const dx = (du+dd)*(this.strDatas[sID].width/this.strDatas[sID].height)*0.5;
                this.vdata = this.vdata.concat(
                    [ x-dx,y+du,this.depths.text, x+dx,y+du,this.depths.text,
                      x-dx,y-dd,this.depths.text, x+dx,y-dd,this.depths.text ]);
                this.cdata = this.cdata.concat(
                    [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7] );
                this.tdata = this.tdata.concat(
                    this.texPoss[sID] );
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
            
            // 矢印
            for(let i=1;i<this.uiList.length-1;i++){
                const color = i===this.cursor ? [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7 ]
                                              : [ 0.4,0.4,0.4, 0.4,0.4,0.4, 0.4,0.4,0.4 ];

                const sID = this.strings.indexOf(this.uiList[i].selectedName);
                const rate = 0.7;
                const xl = xr-bw;
                const y = Yt - i*(bh+bs);
                const ym = y+bh*0.5;
                const yt = ym+bh*rate*0.5, yb = ym-bh*rate*0.5;
                const dx = bh*rate*0.3;

                if(this.uiList[i].selectedID!==this.uiList[i].list.length-1){
                    this.vdata = this.vdata.concat(
                        [ xr-dx-dx,yt,this.depths.text, xr-dx,ym,this.depths.text,
                          xr-dx-dx,yb,this.depths.text                              ]);
                    this.cdata = this.cdata.concat(
                        color );
                    this.tdata = this.tdata.concat(
                        [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                    this.idata = this.idata.concat(
                        [ tmpIDX+0, tmpIDX+1, tmpIDX+2 ]);
                    tmpIDX += 3;
                }

                if(this.uiList[i].selectedID!==0){
                    this.vdata = this.vdata.concat(
                        [ xl+dx,ym,this.depths.text, xl+dx+dx,yt,this.depths.text,
                                                     xl+dx+dx,yb,this.depths.text  ]);
                    this.cdata = this.cdata.concat(
                        color );
                    this.tdata = this.tdata.concat(
                        [ -1.0,-1.0, -1.0,-1.0, -1.0,-1.0 ] ); // none
                    this.idata = this.idata.concat(
                        [ tmpIDX+0, tmpIDX+1, tmpIDX+2 ]);
                    tmpIDX += 3;
                }
            }
        }

        { // ラベル文字列
            const xr = -this.sXlim*0.1;
            const bs = this.sYlim*0.06;
            const bh = this.sYlim* 0.2;
            const Yt = this.sYlim*0.5;
            
            // 選択肢文字列
            for(let i=1;i<this.uiList.length-1;i++){
                const sID = this.strings.indexOf(this.uiList[i].label);
                const y = Yt - i*(bh+bs) + bh*(this.str_descent_max/this.str_height_max);
                const rate = 0.8;
                const du = this.strDatas[sID].ascent  / this.str_height_max * rate * bh;
                const dd = this.strDatas[sID].descent / this.str_height_max * rate * bh;
                const dx = (du+dd)*(this.strDatas[sID].width/this.strDatas[sID].height);
                this.vdata = this.vdata.concat(
                    [ xr-dx,y+du,this.depths.text, xr,y+du,this.depths.text,
                      xr-dx,y-dd,this.depths.text, xr,y-dd,this.depths.text ]);
                this.cdata = this.cdata.concat(
                    [ 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7, 0.7,0.7,0.7] );
                this.tdata = this.tdata.concat(
                    this.texPoss[sID] );
                this.idata = this.idata.concat(
                    [ tmpIDX+0, tmpIDX+1, tmpIDX+2, tmpIDX+2, tmpIDX+3, tmpIDX+1 ]);
                tmpIDX += 4;
            }
        }

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
    }
}